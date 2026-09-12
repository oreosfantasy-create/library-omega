# Identidad visual de Library Omega

La marca principal de Library Omega es el **gatito con el símbolo Ω**. El proyecto no contiene un archivo independiente con esa composición: el recurso disponible (`cat-head-user_833e609c.png`) es únicamente la silueta del gato. Por ello, `client/src/components/BrandMark.tsx` combina ese recurso con un Ω superpuesto y visible; este componente es la representación canónica de la marca en la versión actual.

## Uso autorizado

`BrandMark` debe utilizarse en la cabecera principal, la cabecera del lector, la tarjeta de mascota y cualquier elemento que presente la identidad de Library Omega. La composición restaurada mantiene el gato y el Ω dentro de una misma placa visual, como en el diseño de referencia `add01794`. El recurso de silueta puede utilizarse internamente como capa gráfica del componente, pero no debe presentarse solo en lugares que funcionen como logo.

Si posteriormente se proporciona un archivo oficial compuesto gatito + Ω, debe reemplazarse el recurso interno de `BrandMark` sin cambiar sus integraciones ni modificar el resto de la aplicación.
