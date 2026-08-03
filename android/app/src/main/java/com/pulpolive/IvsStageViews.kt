package com.pulpolive

import android.widget.FrameLayout
import com.amazonaws.ivs.broadcast.BroadcastConfiguration
import com.amazonaws.ivs.broadcast.ImageDevice
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext

/**
 * Container que renderiza el preview de un ImageDevice de IVS y se re-attacha
 * cuando el coordinator cambia de device (flip de cámara, stream remoto nuevo).
 */
abstract class IvsPreviewContainer(context: ThemedReactContext) : FrameLayout(context) {

    private var currentDevice: ImageDevice? = null

    protected val onDeviceChanged: (ImageDevice?) -> Unit = { device ->
        if (device !== currentDevice) {
            currentDevice = device
            removeAllViews()
            device?.let {
                val preview = it.getPreviewView(BroadcastConfiguration.AspectMode.FILL)
                addView(
                    preview,
                    LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
                )
            }
        }
        // RN no dispara layout para views agregadas fuera de su ciclo: forzarlo.
        post {
            measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
            )
            layout(left, top, right, bottom)
        }
    }

    abstract fun register()

    abstract fun unregister()

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        register()
    }

    override fun onDetachedFromWindow() {
        unregister()
        removeAllViews()
        currentDevice = null
        super.onDetachedFromWindow()
    }
}

class IvsLocalPreviewView(context: ThemedReactContext) : IvsPreviewContainer(context) {
    override fun register() {
        IvsStageCoordinator.localPreviewListener = onDeviceChanged
    }

    override fun unregister() {
        if (IvsStageCoordinator.localPreviewListener === onDeviceChanged) {
            IvsStageCoordinator.localPreviewListener = null
        }
    }
}

class IvsRemoteVideoView(context: ThemedReactContext) : IvsPreviewContainer(context) {
    override fun register() {
        IvsStageCoordinator.remoteVideoListener = onDeviceChanged
    }

    override fun unregister() {
        if (IvsStageCoordinator.remoteVideoListener === onDeviceChanged) {
            IvsStageCoordinator.remoteVideoListener = null
        }
    }
}

/** Video del stage PRECALENTADO (slide siguiente del feed, audio en gain 0). */
class IvsPreviewVideoView(context: ThemedReactContext) : IvsPreviewContainer(context) {
    override fun register() {
        IvsStageCoordinator.previewVideoListener = onDeviceChanged
    }

    override fun unregister() {
        if (IvsStageCoordinator.previewVideoListener === onDeviceChanged) {
            IvsStageCoordinator.previewVideoListener = null
        }
    }
}

class IvsLocalPreviewViewManager : SimpleViewManager<IvsLocalPreviewView>() {
    override fun getName(): String = "IvsLocalPreview"

    override fun createViewInstance(reactContext: ThemedReactContext): IvsLocalPreviewView =
        IvsLocalPreviewView(reactContext)
}

class IvsRemoteVideoViewManager : SimpleViewManager<IvsRemoteVideoView>() {
    override fun getName(): String = "IvsRemoteVideo"

    override fun createViewInstance(reactContext: ThemedReactContext): IvsRemoteVideoView =
        IvsRemoteVideoView(reactContext)
}

class IvsPreviewVideoViewManager : SimpleViewManager<IvsPreviewVideoView>() {
    override fun getName(): String = "IvsPreviewVideo"

    override fun createViewInstance(reactContext: ThemedReactContext): IvsPreviewVideoView =
        IvsPreviewVideoView(reactContext)
}
