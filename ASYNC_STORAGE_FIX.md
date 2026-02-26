# Solución para el error "NativeModule AsyncStorage is null"

Este error ocurre cuando el módulo nativo de AsyncStorage no está vinculado correctamente. Sigue estos pasos para solucionarlo:

## Para iOS:

1. **Instalar CocoaPods** (si no lo tienes):
   ```bash
   sudo gem install cocoapods
   ```

2. **Navegar a la carpeta iOS**:
   ```bash
   cd ios
   ```

3. **Instalar las dependencias nativas**:
   ```bash
   pod install
   ```

4. **Limpiar y rebuild**:
   ```bash
   cd ..
   npm start -- --reset-cache
   ```

5. **En otra terminal, ejecutar iOS**:
   ```bash
   npm run ios
   ```

   O desde Xcode:
   - Abre `ios/PlatformMobile.xcworkspace` (NO el .xcodeproj)
   - Product > Clean Build Folder (Shift + Cmd + K)
   - Product > Build (Cmd + B)

## Para Android:

1. **Limpiar el proyecto**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. **Rebuild**:
   ```bash
   npm start -- --reset-cache
   ```

3. **En otra terminal, ejecutar Android**:
   ```bash
   npm run android
   ```

## Solución alternativa temporal:

Si necesitas una solución temporal mientras configuras el entorno, el código ahora incluye manejo de errores que evitará que la app crashee. Sin embargo, los tokens no se guardarán hasta que AsyncStorage esté correctamente vinculado.

## Verificar la instalación:

Después de seguir los pasos, verifica que AsyncStorage esté funcionando:

```bash
# Verificar que el paquete está instalado
npm list @react-native-async-storage/async-storage

# Debería mostrar la versión instalada
```

## Notas importantes:

- **iOS**: Siempre usa el archivo `.xcworkspace`, nunca el `.xcodeproj` después de instalar pods
- **Android**: Asegúrate de que el proyecto esté limpio antes de rebuild
- **Metro**: Siempre resetea la caché después de instalar módulos nativos nuevos
