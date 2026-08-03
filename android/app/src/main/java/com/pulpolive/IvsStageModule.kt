package com.pulpolive

import android.Manifest
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.amazonaws.ivs.broadcast.AudioDevice
import com.amazonaws.ivs.broadcast.AudioLocalStageStream
import com.amazonaws.ivs.broadcast.BroadcastException
import com.amazonaws.ivs.broadcast.Device
import com.amazonaws.ivs.broadcast.DeviceDiscovery
import com.amazonaws.ivs.broadcast.ImageDevice
import com.amazonaws.ivs.broadcast.ImageLocalStageStream
import com.amazonaws.ivs.broadcast.LocalStageStream
import com.amazonaws.ivs.broadcast.ParticipantInfo
import com.amazonaws.ivs.broadcast.Stage
import com.amazonaws.ivs.broadcast.StageRenderer
import com.amazonaws.ivs.broadcast.StageStream
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge de Amazon IVS Real-Time (Stages).
 *
 * Dos slots de stage:
 * - MAIN: el vivo activo (el seller publica o el viewer mira, con audio).
 * - PREVIEW: precalienta el stage del siguiente slide del feed (subscribe con
 *   audio en gain 0). joinAsViewer con el token del preview lo PROMUEVE a main
 *   sin reconectar: el video del próximo vivo aparece al instante al swipear.
 *
 * Espejo del contrato de KinesisWebRTCNative: start/stop, mute de mic,
 * pausa de video y flip de cámara.
 */
class IvsStageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "IvsStage"

    private fun missingPublishPermission(): String? {
        val ctx = reactApplicationContext
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return "Falta el permiso de cámara"
        }
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            return "Falta el permiso de micrófono"
        }
        return null
    }

    @ReactMethod
    fun joinAsPublisher(token: String, initialFacingMode: String, promise: Promise) {
        // El SDK captura cámara/mic en threads propios: sin estos permisos el
        // proceso muere fuera de cualquier try/catch. Rechazar acá, nunca crashear.
        missingPublishPermission()?.let {
            promise.reject("IVS_PERMISSION", it)
            return
        }
        UiThreadUtil.runOnUiThread {
            try {
                IvsStageCoordinator.joinAsPublisher(reactApplicationContext, token, initialFacingMode)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("IVS_JOIN_PUBLISHER", e.message, e)
            }
        }
    }

    @ReactMethod
    fun joinAsViewer(token: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                IvsStageCoordinator.joinAsViewer(reactApplicationContext, token)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("IVS_JOIN_VIEWER", e.message, e)
            }
        }
    }

    @ReactMethod
    fun startPreview(token: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                IvsStageCoordinator.startPreview(reactApplicationContext, token)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("IVS_START_PREVIEW", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stopPreview(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.stopPreview()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setPreviewAudioMuted(muted: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.setPreviewAudioMuted(muted)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun leave(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.leaveMain()
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setVideoMuted(muted: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.setVideoMuted(muted)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun setMicMuted(muted: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.setMicMuted(muted)
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun switchCamera(facingMode: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                IvsStageCoordinator.switchCamera(facingMode)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("IVS_SWITCH_CAMERA", e.message, e)
            }
        }
    }

    @ReactMethod
    fun setRemoteAudioMuted(muted: Boolean, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            IvsStageCoordinator.setRemoteAudioMuted(muted)
            promise.resolve(null)
        }
    }

    // Requeridos por NativeEventEmitter (no-op: emitimos por RCTDeviceEventEmitter).
    @ReactMethod
    fun addListener(eventName: String) = Unit

    @ReactMethod
    fun removeListeners(count: Int) = Unit

    override fun invalidate() {
        UiThreadUtil.runOnUiThread { IvsStageCoordinator.leaveAll() }
        super.invalidate()
    }
}

/**
 * Dueño de los stages (main + preview), los devices locales y los streams
 * remotos. Todo se toca desde el main thread (requisito del SDK de IVS).
 */
object IvsStageCoordinator : Stage.Strategy, StageRenderer {

    private var reactContext: ReactApplicationContext? = null
    private var discovery: DeviceDiscovery? = null

    // ---- Slot MAIN (vivo activo: publisher del seller o viewer con audio) ----
    private var mainStage: Stage? = null
    private var mainToken: String? = null
    private var publishing = false
    private var cameraStream: ImageLocalStageStream? = null
    private var micStream: AudioLocalStageStream? = null
    private var currentFacing: String = "user"
    private var remoteVideoStream: StageStream? = null
    private var remoteAudioStream: StageStream? = null
    private var remoteAudioMuted = false

    // ---- Slot PREVIEW (siguiente slide del feed / peek del home) ----
    // El audio arranca SIEMPRE muteado; el peek del home lo activa explícito.
    private var previewStage: Stage? = null
    private var previewToken: String? = null
    private var previewVideoStream: StageStream? = null
    private var previewAudioStream: StageStream? = null
    private var previewAudioMuted = true

    /** Las views se registran para recibir el ImageDevice a renderizar. */
    var localPreviewListener: ((ImageDevice?) -> Unit)? = null
        set(value) {
            field = value
            value?.invoke(cameraStream?.device as? ImageDevice)
        }
    var remoteVideoListener: ((ImageDevice?) -> Unit)? = null
        set(value) {
            field = value
            value?.invoke(remoteVideoStream?.device as? ImageDevice)
        }
    var previewVideoListener: ((ImageDevice?) -> Unit)? = null
        set(value) {
            field = value
            value?.invoke(previewVideoStream?.device as? ImageDevice)
        }

    fun joinAsPublisher(context: ReactApplicationContext, token: String, facingMode: String) {
        leaveAll()
        reactContext = context
        publishing = true
        currentFacing = if (facingMode == "environment") "environment" else "user"
        val disc = DeviceDiscovery(context.applicationContext)
        discovery = disc
        cameraStream = ImageLocalStageStream(findCamera(disc, currentFacing))
        micStream = AudioLocalStageStream(findMicrophone(disc))
        mainStage = createAndJoin(context, token)
        mainToken = token
        localPreviewListener?.invoke(cameraStream?.device as? ImageDevice)
    }

    fun joinAsViewer(context: ReactApplicationContext, token: String) {
        reactContext = context
        // Ya conectados a este stage: solo re-anunciar el estado (los listeners
        // JS pueden haberse registrado después del stream).
        if (token == mainToken && mainStage != null) {
            reemitMainState()
            return
        }
        // El token corresponde al stage precalentado: PROMOVER sin reconectar.
        if (token == previewToken && previewStage != null) {
            promotePreview()
            return
        }
        leaveMain()
        publishing = false
        mainStage = createAndJoin(context, token)
        mainToken = token
    }

    fun startPreview(context: ReactApplicationContext, token: String) {
        reactContext = context
        if (token == previewToken && previewStage != null) return
        if (token == mainToken && mainStage != null) return
        stopPreview()
        previewAudioMuted = true
        previewStage = createAndJoin(context, token)
        previewToken = token
    }

    fun stopPreview() {
        previewStage?.let {
            try {
                it.leave()
            } finally {
                it.release()
            }
        }
        previewStage = null
        previewToken = null
        previewVideoStream = null
        previewAudioStream = null
        previewAudioMuted = true
        previewVideoListener?.invoke(null)
    }

    /** Audio del slot preview (el peek del home lo enciende; el swipe lo deja muteado). */
    fun setPreviewAudioMuted(muted: Boolean) {
        previewAudioMuted = muted
        (previewAudioStream?.device as? AudioDevice)?.setGain(if (muted) 0f else 1f)
    }

    /** El stage precalentado pasa a ser el vivo activo (sin reconexión). */
    private fun promotePreview() {
        mainStage?.let {
            try {
                it.leave()
            } finally {
                it.release()
            }
        }
        publishing = false
        mainStage = previewStage
        mainToken = previewToken
        remoteVideoStream = previewVideoStream
        remoteAudioStream = previewAudioStream
        previewStage = null
        previewToken = null
        previewVideoStream = null
        previewAudioStream = null
        previewVideoListener?.invoke(null)
        // Subir el audio (el preview corría en gain 0) y anunciar el video.
        remoteAudioMuted = false
        (remoteAudioStream?.device as? AudioDevice)?.setGain(1f)
        reemitMainState()
    }

    private fun reemitMainState() {
        val video = remoteVideoStream
        remoteVideoListener?.invoke(video?.device as? ImageDevice)
        if (video != null) {
            emit(
                "IvsStage:remoteVideo",
                Arguments.createMap().apply {
                    putString("participantId", null)
                    putBoolean("hasVideo", true)
                },
            )
        }
    }

    private fun createAndJoin(context: ReactApplicationContext, token: String): Stage {
        val s = Stage(context.applicationContext, token, this)
        s.addRenderer(this)
        s.join()
        return s
    }

    fun leaveMain() {
        mainStage?.let {
            try {
                it.leave()
            } finally {
                it.release()
            }
        }
        mainStage = null
        mainToken = null
        remoteVideoStream = null
        remoteAudioStream = null
        remoteAudioMuted = false
        remoteVideoListener?.invoke(null)
        localPreviewListener?.invoke(null)
        cameraStream = null
        micStream = null
        if (previewStage == null) {
            discovery?.release()
            discovery = null
        }
        publishing = false
    }

    fun leaveAll() {
        stopPreview()
        leaveMain()
    }

    fun setVideoMuted(muted: Boolean) {
        cameraStream?.muted = muted
        mainStage?.refreshStrategy()
    }

    fun setMicMuted(muted: Boolean) {
        micStream?.muted = muted
        mainStage?.refreshStrategy()
    }

    /** Mute local del audio remoto del vivo activo (botón de silencio del viewer). */
    fun setRemoteAudioMuted(muted: Boolean) {
        remoteAudioMuted = muted
        (remoteAudioStream?.device as? AudioDevice)?.setGain(if (muted) 0f else 1f)
    }

    fun switchCamera(facingMode: String) {
        val disc = discovery ?: return
        val wasMuted = cameraStream?.muted ?: false
        currentFacing = if (facingMode == "environment") "environment" else "user"
        cameraStream = ImageLocalStageStream(findCamera(disc, currentFacing)).also {
            it.muted = wasMuted
        }
        mainStage?.refreshStrategy()
        localPreviewListener?.invoke(cameraStream?.device as? ImageDevice)
    }

    private fun findCamera(disc: DeviceDiscovery, facingMode: String): ImageDevice {
        val wantedPosition = if (facingMode == "environment") {
            Device.Descriptor.Position.BACK
        } else {
            Device.Descriptor.Position.FRONT
        }
        val cameras = disc.listLocalDevices()
            .filter { it.descriptor.type == Device.Descriptor.DeviceType.CAMERA }
        val camera = cameras.firstOrNull { it.descriptor.position == wantedPosition }
            ?: cameras.firstOrNull()
            ?: throw IllegalStateException("Sin cámara disponible")
        return camera as ImageDevice
    }

    private fun findMicrophone(disc: DeviceDiscovery): AudioDevice {
        val mic = disc.listLocalDevices()
            .firstOrNull { it.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE }
            ?: throw IllegalStateException("Sin micrófono disponible")
        return mic as AudioDevice
    }

    private fun emit(event: String, params: com.facebook.react.bridge.WritableMap?) {
        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit(event, params)
    }

    // ---- Stage.Strategy (compartida por ambos slots) ----

    override fun stageStreamsToPublishForParticipant(
        stage: Stage,
        participantInfo: ParticipantInfo,
    ): List<LocalStageStream> =
        if (publishing && stage === mainStage) listOfNotNull(cameraStream, micStream) else emptyList()

    override fun shouldPublishFromParticipant(
        stage: Stage,
        participantInfo: ParticipantInfo,
    ): Boolean = publishing && stage === mainStage

    override fun shouldSubscribeToParticipant(
        stage: Stage,
        participantInfo: ParticipantInfo,
    ): Stage.SubscribeType =
        if (publishing && stage === mainStage) Stage.SubscribeType.NONE
        else Stage.SubscribeType.AUDIO_VIDEO

    // ---- StageRenderer (distingue slot por identidad del stage) ----

    override fun onConnectionStateChanged(
        stage: Stage,
        state: Stage.ConnectionState,
        exception: BroadcastException?,
    ) {
        if (stage === previewStage) {
            // El preview cae en silencio: al swipear, joinAsViewer reconecta normal.
            if (state == Stage.ConnectionState.DISCONNECTED) stopPreview()
            return
        }
        if (stage !== mainStage) return
        val map = Arguments.createMap().apply {
            putString("state", state.name)
            exception?.let { putString("error", it.detail) }
        }
        emit("IvsStage:connectionState", map)
    }

    override fun onStreamsAdded(
        stage: Stage,
        participantInfo: ParticipantInfo,
        streams: MutableList<StageStream>,
    ) {
        if (participantInfo.isLocal) return
        if (stage === previewStage) {
            streams.firstOrNull { it.streamType == StageStream.Type.AUDIO }?.let {
                previewAudioStream = it
                // Muteado por default; el peek del home lo enciende explícito.
                (it.device as? AudioDevice)?.setGain(if (previewAudioMuted) 0f else 1f)
            }
            streams.firstOrNull { it.streamType == StageStream.Type.VIDEO }?.let {
                previewVideoStream = it
                previewVideoListener?.invoke(it.device as? ImageDevice)
            }
            return
        }
        if (stage !== mainStage) return
        streams.firstOrNull { it.streamType == StageStream.Type.AUDIO }?.let {
            remoteAudioStream = it
            (it.device as? AudioDevice)?.setGain(if (remoteAudioMuted) 0f else 1f)
        }
        val video = streams.firstOrNull { it.streamType == StageStream.Type.VIDEO }
            ?: return
        remoteVideoStream = video
        remoteVideoListener?.invoke(video.device as? ImageDevice)
        emit(
            "IvsStage:remoteVideo",
            Arguments.createMap().apply {
                putString("participantId", participantInfo.participantId)
                putBoolean("hasVideo", true)
            },
        )
    }

    override fun onStreamsRemoved(
        stage: Stage,
        participantInfo: ParticipantInfo,
        streams: MutableList<StageStream>,
    ) {
        if (participantInfo.isLocal) return
        if (stage === previewStage) {
            if (streams.any { it === previewVideoStream }) {
                previewVideoStream = null
                previewVideoListener?.invoke(null)
            }
            return
        }
        if (stage !== mainStage) return
        if (streams.any { it === remoteVideoStream }) {
            remoteVideoStream = null
            remoteVideoListener?.invoke(null)
            emit(
                "IvsStage:remoteVideo",
                Arguments.createMap().apply {
                    putString("participantId", participantInfo.participantId)
                    putBoolean("hasVideo", false)
                },
            )
        }
    }

    override fun onStreamsMutedChanged(
        stage: Stage,
        participantInfo: ParticipantInfo,
        streams: MutableList<StageStream>,
    ) = Unit

    override fun onParticipantJoined(stage: Stage, participantInfo: ParticipantInfo) = Unit

    override fun onParticipantLeft(stage: Stage, participantInfo: ParticipantInfo) = Unit

    override fun onParticipantPublishStateChanged(
        stage: Stage,
        participantInfo: ParticipantInfo,
        publishState: Stage.PublishState,
    ) {
        if (!participantInfo.isLocal || stage !== mainStage) return
        emit(
            "IvsStage:publishState",
            Arguments.createMap().apply { putString("state", publishState.name) },
        )
    }

    override fun onParticipantSubscribeStateChanged(
        stage: Stage,
        participantInfo: ParticipantInfo,
        subscribeState: Stage.SubscribeState,
    ) = Unit

    override fun onError(exception: BroadcastException) {
        emit(
            "IvsStage:error",
            Arguments.createMap().apply { putString("error", exception.detail) },
        )
    }
}
