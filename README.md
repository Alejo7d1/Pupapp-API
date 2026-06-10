# Pupapp API

Bienvenido a la documentación de la API de Pupapp. Esta API está diseñada para gestionar restaurantes, productos y órdenes, sirviendo como backend para una aplicación móvil. La API implementa un modelo multi-inquilino (multi-tenant) donde cada restaurante es una entidad independiente con sus propios datos.

## Autenticación y Tokens (Identificador Unitario por Restaurante)

La seguridad y la segregación de datos son pilares fundamentales de esta API. Cada restaurante se identifica de manera única mediante un `access_name` y se autentica para obtener un JSON Web Token (JWT). Este token es crucial porque **actúa como el identificador unitario para cada restaurante** en todas las operaciones protegidas.

### ¿Cómo funciona?

1.  **Registro (`/api/auth/register`):** Un nuevo restaurante se registra con un `access_name` único y una contraseña.
2.  **Login (`/api/auth/login`):** El restaurante envía su `access_name` y contraseña. Si las credenciales son válidas, la API genera un JWT.
3.  **Contenido del Token:** El JWT no es solo una prueba de autenticación; contiene información vital para identificar al restaurante:
    *   `restaurant_id`: El ID numérico único del restaurante en la base de datos.
    *   `access_name`: El nombre de acceso único del restaurante.

    Este `restaurant_id` se inyecta en el objeto `req` (como `req.restaurant_id`) a través del middleware `validateToken`.

4.  **Segregación de Datos:** En cada endpoint protegido, todas las consultas a la base de datos (`db.select().where(eq(table.restaurant_id, req.restaurant_id))`) utilizan `req.restaurant_id` para filtrar los datos. Esto asegura que:
    *   Un restaurante solo pueda ver, crear, actualizar o eliminar **sus propios productos**.
    *   Un restaurante solo pueda ver, crear, actualizar o eliminar **sus propias órdenes**.
    *   Es imposible que un restaurante acceda o modifique datos de otro restaurante, ya que el `restaurant_id` en el token es el único filtro permitido.

Este diseño garantiza que el token JWT no solo autentica al usuario, sino que también define el alcance de sus permisos a nivel de datos, haciendo que cada restaurante opere en su propio "espacio" dentro de la aplicación.

---

## Rutas de Acceso (Endpoints)

A continuación, se detallan las rutas disponibles en la API, categorizadas por su nivel de protección.

### Rutas Públicas (Autenticación)

Estas rutas no requieren un token JWT para ser accedidas.

#### 1. Registrar un Nuevo Restaurante
*   **URL:** `POST /api/auth/register`
*   **Descripción:** Permite registrar un nuevo restaurante en el sistema.
*   **Body (JSON):**
    ```json
    {
      "access_name": "nombre_unico_restaurante",
      "password": "password_seguro",
      "business_display_name": "Nombre Visible del Restaurante"
    }
    ```

#### 2. Iniciar Sesión
*   **URL:** `POST /api/auth/login`
*   **Descripción:** Autentica un restaurante y devuelve un JWT para acceder a las rutas protegidas.
*   **Body (JSON):**
    ```json
    {
      "access_name": "nombre_unico_restaurante",
      "password": "password_seguro"
    }
    ```
*   **Respuesta (JSON):**
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "business_display_name": "Nombre Visible del Restaurante"
    }
    ```

### Rutas Protegidas (Requieren JWT)

Todas estas rutas requieren un token JWT válido en el encabezado `Authorization` (formato `Bearer TU_TOKEN_JWT`).

#### Productos

##### 1. Obtener Todos los Productos
*   **URL:** `GET /api/products`
*   **Descripción:** Devuelve una lista paginada de todos los productos del restaurante autenticado.
*   **Query Params (Opcional):**
    *   `page`: Número de página (por defecto 1).
    *   `limit`: Cantidad de elementos por página (por defecto 10).

##### 2. Obtener Producto por ID
*   **URL:** `GET /api/products/:id`
*   **Descripción:** Devuelve los detalles de un producto específico del restaurante autenticado.

##### 3. Crear un Nuevo Producto
*   **URL:** `POST /api/products`
*   **Descripción:** Crea un nuevo producto para el restaurante autenticado. Soporta subida de imágenes a Cloudflare R2.
*   **Body (form-data):**
    *   `name`: (texto) Nombre del producto.
    *   `price_base`: (texto) Precio base del producto (ej. `1.50`).
    *   `category`: (texto) Categoría del producto.
    *   `image`: (archivo) Archivo de imagen para subir a R2.

##### 4. Actualizar un Producto
*   **URL:** `PUT /api/products/:id`
*   **Descripción:** Actualiza los detalles de un producto existente del restaurante autenticado. Soporta actualización de imagen en R2.
*   **Body (form-data):** Mismos campos que `POST /api/products`.

##### 5. Eliminar un Producto
*   **URL:** `DELETE /api/products/:id`
*   **Descripción:** Elimina un producto específico del restaurante autenticado. También elimina la imagen asociada de Cloudflare R2.

#### Órdenes

##### 1. Obtener Todas las Órdenes
*   **URL:** `GET /api/orders`
*   **Descripción:** Devuelve una lista paginada de todas las órdenes del restaurante autenticado, incluyendo los ítems de cada orden.
*   **Query Params (Opcional):**
    *   `page`: Número de página (por defecto 1).
    *   `limit`: Cantidad de elementos por página (por defecto 10).

##### 2. Obtener Detalles de una Orden
*   **URL:** `GET /api/orders/:id`
*   **Descripción:** Devuelve los detalles completos de una orden específica del restaurante autenticado, incluyendo sus ítems.

##### 3. Crear una Nueva Orden
*   **URL:** `POST /api/orders`
*   **Descripción:** Crea una nueva orden para el restaurante autenticado.
*   **Body (JSON):**
    ```json
    {
      "order_reference": "Mesa 5 - Cena",
      "customer_name": "Cliente Frecuente",
      "final_total": null, // Si es null, se calcula automáticamente. Si se envía un valor, se usa ese.
      "total_adjustment_note": "Descuento por promoción",
      "items": [
        {
          "productId": 1, // ID del producto
          "quantity": 2
        },
        {
          "productId": 3,
          "quantity": 1
        }
      ]
    }
    ```
    **Nota:** La tabla `order_item` ahora guarda el `product_name` en lugar del `product_id` para evitar problemas de integridad referencial si un producto es eliminado.

##### 4. Actualizar Estado de una Orden
*   **URL:** `PATCH /api/orders/:id/status`
*   **Descripción:** Actualiza el `status_id` de una orden específica del restaurante autenticado.
*   **Body (JSON):**
    ```json
    {
      "status_id": 2 // ID del nuevo estado (ej. 1: Pendiente, 2: Preparando, 3: Entregado)
    }
    ```

##### 5. Eliminar una Orden
*   **URL:** `DELETE /api/orders/:id`
*   **Descripción:** Elimina una orden específica del restaurante autenticado. Debido a la relación `ON DELETE CASCADE`, todos los ítems de la orden también serán eliminados.
```
<!--
[PROMPT_SUGGESTION]¿Cómo puedo agregar un campo "stock" a los productos y validar que haya disponibilidad antes de crear una orden?[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Modifica el endpoint de login para que devuelva también el logo del restaurante si tuviera uno, guardado en R2.[/PROMPT_SUGGESTION]
