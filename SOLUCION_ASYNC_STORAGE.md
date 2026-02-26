# Solución para el error de AsyncStorage y iconos SVG

## ⚠️ Problemas

1. **AsyncStorage**: El error `NativeModule: AsyncStorage is null` ocurre porque el módulo nativo de AsyncStorage no está vinculado correctamente a la aplicación.

2. **Iconos SVG**: Los iconos de `lucide-react-native` no se ven porque `react-native-svg` también necesita estar vinculado al módulo nativo.

## ✅ Solución Paso a Paso

### Para iOS:

1. **Detén Metro Bundler** si está corriendo (Ctrl+C)

2. **Navega a la carpeta iOS**:
   ```bash
   cd ios
   ```

3. **Instala los pods** (necesitas tener CocoaPods instalado):
   ```bash
   pod install
   ```
   
   Si no tienes CocoaPods instalado:
   ```bash
   sudo gem install cocoapods
   pod install
   ```

4. **Vuelve a la raíz del proyecto**:
   ```bash
   cd ..
   ```

5. **Limpia la caché de Metro**:
   ```bash
   npm start -- --reset-cache
   ```

6. **En otra terminal, ejecuta la app**:
   ```bash
   npm run ios
   ```
   
   **O desde Xcode**:
   - Abre `ios/PlatformMobile.xcworkspace` (⚠️ IMPORTANTE: usa `.xcworkspace`, NO `.xcodeproj`)
   - Product > Clean Build Folder (Shift + Cmd + K)
   - Product > Build (Cmd + B)
   - Ejecuta la app desde Xcode

### Para Android:

1. **Detén Metro Bundler** si está corriendo (Ctrl+C)

2. **Limpia el proyecto Android**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

3. **Limpia la caché de Metro**:
   ```bash
   npm start -- --reset-cache
   ```

4. **En otra terminal, ejecuta la app**:
   ```bash
   npm run android
   ```

## 📝 Notas Importantes

- **iOS**: Después de `pod install`, SIEMPRE usa el archivo `.xcworkspace`, nunca el `.xcodeproj`
- **Metro**: Siempre resetea la caché después de instalar módulos nativos nuevos
- **Rebuild**: Necesitas hacer un rebuild completo de la app, no solo un hot reload

## 🔍 Verificación

Después de seguir los pasos, verifica que:
1. El error de AsyncStorage ya no aparece en la consola
2. Los tokens se guardan correctamente después del login
3. La sesión persiste al cerrar y abrir la app
4. Los iconos de mostrar/ocultar contraseña se ven correctamente en los campos de contraseña

## 💡 Estado Actual

El código está preparado para manejar el error sin crashear la app, pero:
- Los tokens **no se guardarán** hasta que AsyncStorage esté correctamente vinculado
- Los iconos **no se verán** hasta que react-native-svg esté correctamente vinculado

Ambos módulos nativos se vinculan automáticamente cuando ejecutas `pod install` (iOS) o rebuild (Android).

Si después de seguir estos pasos el error persiste, puede ser necesario:
- Verificar que `@react-native-async-storage/async-storage` y `react-native-svg` están en `package.json`
- Verificar que el autolinking está funcionando correctamente
- Revisar los logs de Metro para ver si hay otros errores
- Limpiar completamente el proyecto y rebuild desde cero
