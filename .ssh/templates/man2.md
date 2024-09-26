# Tutorial: Instalación y Configuración de Rate Limit en Apache con ModSecurity y mod_headers en Amazon Linux 2023

Este tutorial te guiará paso a paso para instalar **ModSecurity** en **Amazon Linux 2023** y configurarlo para limitar las solicitudes a **10 por segundo** bajo las siguientes condiciones:
- Método HTTP: `POST`
- La URL termina en `/acs`
- El cuerpo de la solicitud contiene la palabra `PERIODIC` en una etiqueta `<EventCode>`

Además, configuraremos el encabezado **`Retry-After`** en las respuestas **429 Too Many Requests**, para que el cliente sepa cuánto tiempo debe esperar antes de reintentar.

## 1. Actualizar el sistema y asegurarse de que Apache está instalado

Primero, actualiza tu sistema e instala Apache:

```bash
sudo yum update -y
sudo yum install -y httpd
```

Inicia Apache y habilita el servicio para que se inicie automáticamente:

```bash
sudo systemctl start httpd
sudo systemctl enable httpd
```

## 2. Instalar dependencias necesarias para ModSecurity

Dado que ModSecurity no está disponible directamente en los repositorios de Amazon Linux 2023, lo instalaremos desde el código fuente. Para eso, primero instalaremos las dependencias necesarias:

```bash
sudo yum groupinstall "Development Tools" -y
sudo yum install -y curl-devel libxml2 libxml2-devel pcre pcre-devel git
```

## 3. Clonar y compilar ModSecurity

Ahora clonaremos el repositorio de **ModSecurity** y lo compilaremos manualmente:

```bash
cd /usr/local/src
sudo git clone --depth 1 -b v3/master https://github.com/SpiderLabs/ModSecurity
cd ModSecurity
```

Compila e instala **ModSecurity**:

```bash
sudo ./build.sh
sudo git submodule init
sudo git submodule update
sudo ./configure
sudo make
sudo make install
```

## 4. Instalar el conector de ModSecurity para Apache

ModSecurity necesita un conector para integrarse con Apache. Para ello, clonaremos y compilaremos el repositorio del conector **ModSecurity-Apache**:

```bash
cd /usr/local/src
sudo git clone https://github.com/SpiderLabs/ModSecurity-apache.git
cd ModSecurity-apache
```

Compila e instala el conector:

```bash
sudo ./autogen.sh
sudo ./configure --with-apxs=/usr/bin/apxs
sudo make
sudo make install
```

## 5. Configurar ModSecurity

Copia el archivo de configuración base de ModSecurity:

```bash
sudo cp /usr/local/modsecurity/etc/modsecurity.conf-recommended /usr/local/modsecurity/etc/modsecurity.conf
```

Edita el archivo `/usr/local/modsecurity/etc/modsecurity.conf` para activar el motor de reglas cambiando la siguiente línea:

```apache
SecRuleEngine DetectionOnly
```

Por:

```apache
SecRuleEngine On
```

### Habilitar ModSecurity en Apache

Edita el archivo de configuración principal de Apache:

```bash
sudo nano /etc/httpd/conf/httpd.conf
```

Añade las siguientes líneas al final del archivo para cargar el módulo de **ModSecurity** y su configuración:

```apache
LoadModule security3_module modules/mod_security3.so
<IfModule security3_module>
    Include /usr/local/modsecurity/etc/modsecurity.conf
</IfModule>
```

Guarda el archivo y reinicia Apache para aplicar los cambios:

```bash
sudo systemctl restart httpd
```

## 6. Crear las reglas personalizadas de rate limit

Crea un archivo de configuración para las reglas personalizadas de ModSecurity:

```bash
sudo nano /etc/httpd/modsecurity-ratelimit.conf
```

Agrega las siguientes reglas:

```apache
# Filtro solo si la URL termina en /acs y el método es POST
SecRule REQUEST_URI "@endsWith /acs" "phase:1, id:1001, t:none, pass, nolog"
SecRule REQUEST_METHOD "@streq POST" "phase:1, id:1002, t:none, pass, nolog"

# Verificar que haya exactamente una etiqueta <EventCode>
SecRule REQUEST_BODY "@rx <EventCode>.*?</EventCode>" "phase:2, id:1003, capture, pass, nolog"
SecRule TX:0 "@eq 1" "phase:2, id:1004, pass, nolog"

# Verificar que el contenido de <EventCode> contenga la palabra 'PERIODIC' sin importar mayúsculas/minúsculas
SecRule REQUEST_BODY "@rx <EventCode>\s*PERIODIC\s*</EventCode>" "phase:2, id:1005, t:lowercase, pass, nolog"

# Incrementar el contador global de solicitudes solo si se cumplen todas las condiciones anteriores
SecAction "id:1006, phase:2, pass, nolog, setvar:global.req_counter=+1, expirevar:global.req_counter=1"

# Limitar a 10 solicitudes por segundo para todas las solicitudes que cumplan las condiciones
SecRule GLOBAL:req_counter "@gt 10" "phase:2, id:1007, t:none, deny, status:429, msg:'Rate limit exceeded', \
    setenv:RATELIMIT_RETRY=1, setvar:'tx.retry_time=5'"

# Añadir el encabezado Retry-After utenv=RATELIMIT_RETRYilizando mod_headers si se supera el límite de solicitudes
Header always set Retry-After "5" 
```

### Incluir las reglas en Apache

Edita el archivo de configuración principal de Apache `/etc/httpd/conf/httpd.conf` para incluir el archivo de reglas personalizadas:

```bash
sudo nano /etc/httpd/conf/httpd.conf
```

Añade esta línea al final del archivo:

```bash
Include /etc/httpd/modsecurity-ratelimit.conf
```

Guarda el archivo y reinicia Apache:

```bash
sudo systemctl restart httpd
```

## 7. Probar el rate limit

Usa el siguiente script en Node.js para probar que el **rate limit** está funcionando correctamente y que el servidor responde con **429 Too Many Requests** junto con el encabezado **`Retry-After`**:

### Instalación de `node-fetch`

Primero, instala `node-fetch` si no lo tienes:

```bash
npm install node-fetch
```

### Crear el script de prueba

Crea un archivo `test.js` con el siguiente contenido:

```javascript
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuración del ratio de peticiones por segundo
const ratioPerSecond = 15; // Cambia este valor para ajustar el ratio y probar el límite

// URL a la que se enviarán las peticiones
const url = 'http://localhost:8080/acs';

// Cuerpo de la petición SOAP que se va a enviar
const soapBody = `
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:cwmp="urn:dslforum-org:cwmp-1-0">
    <SOAP-ENV:Body>
      <cwmp:Inform>
        <Event>
          <EventStruct>
            <EventCode>PERIODIC</EventCode>
            <CommandKey></CommandKey>
          </EventStruct>
        </Event>
      </cwmp:Inform>
    </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

// Configuración de la petición POST
const requestOptions = {
  method: 'POST',
  headers: {
    'Content-Type': 'text/xml',
  },
  body: soapBody,
};

// Función que envía una petición
function sendRequest() {
  fetch(url, requestOptions)
    .then(response => response.text())
    .then(result => {
      console.log('Request sent:', result);
    })
    .catch(error => {
      console.error('Error sending request:', error);
    });
