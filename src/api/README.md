# API Module

Este módulo contiene todos los endpoints de la API de autenticación del servicio de usuarios.

## Estructura

```
src/api/
├── config.ts       # Configuración de URLs y endpoints
├── types.ts        # Tipos TypeScript para requests y responses
├── authApi.ts      # Funciones de los endpoints de autenticación
├── index.ts        # Exportaciones principales
└── README.md       # Esta documentación
```

## Uso

### Importar funciones

```typescript
import { login, getCurrentUser, createBuyerUser } from '@/api';
```

### Ejemplo de Login

```typescript
import { login, ApiError } from '@/api';

try {
  const response = await login({
    username: 'usuario@email.com',
    password: 'contraseña123',
  });
  
  console.log('Token:', response.data?.access_token);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Error:', error.message);
  }
}
```

### Ejemplo de Crear Usuario Comprador

```typescript
import { createBuyerUser } from '@/api';

try {
  const response = await createBuyerUser({
    email: 'nuevo@email.com',
    name: 'Juan',
    last_name: 'Pérez',
    password: 'contraseña123',
    repeat_password: 'contraseña123',
  });
  
  console.log('Usuario creado:', response.data);
} catch (error) {
  console.error('Error:', error);
}
```

## Endpoints Disponibles

- `login()` - Iniciar sesión
- `logout()` - Cerrar sesión
- `getCurrentUser()` - Obtener usuario actual
- `refreshToken()` - Refrescar token de acceso
- `createBuyerUser()` - Crear usuario comprador
- `createSellerUser()` - Crear usuario vendedor
- `getUserByUuid()` - Obtener usuario por UUID
- `forgotPasswordRequest()` - Solicitar código de recuperación
- `forgotPassword()` - Verificar código de recuperación
- `resetPassword()` - Restablecer contraseña
- `verifyUser()` - Verificar usuario con código
- `resendVerificationCode()` - Reenviar código de verificación

## Configuración

La URL base de la API se configura en `config.ts`. Por defecto usa:
- Desarrollo: `http://localhost:8000`
- Producción: `https://api.whatyes.com`

## Almacenamiento de Tokens

⚠️ **IMPORTANTE**: Las funciones `getStoredToken()` y `storeTokens()` están pendientes de implementación.

Se recomienda usar `@react-native-async-storage/async-storage` o `expo-secure-store` para almacenar los tokens de forma segura.

Ejemplo de implementación:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getStoredToken(): Promise<string | null> {
  return await AsyncStorage.getItem('access_token');
}

async function storeTokens(tokens: { access_token: string; refresh_token: string }): Promise<void> {
  await AsyncStorage.multiSet([
    ['access_token', tokens.access_token],
    ['refresh_token', tokens.refresh_token],
  ]);
}
```

## Manejo de Errores

Todas las funciones pueden lanzar `ApiError` que incluye:
- `status`: Código de estado HTTP
- `message`: Mensaje de error
- `data`: Datos adicionales del error

```typescript
import { ApiError } from '@/api';

try {
  await login(credentials);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`Error ${error.status}: ${error.message}`);
  }
}
```
