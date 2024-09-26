const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Configuración del ratio de peticiones por segundo
const ratioPerSecond = 15; // Cambia este valor para ajustar el ratio


// URL a la que se enviarán las peticiones (ajusta esta URL a la de tu servidor)
const url = 'http://localhost:80/acs';

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
let counter = 0;

// Función que envía una petición
function sendRequest() {
  counter++;
  fetch(url, requestOptions)
    .then(response =>{
     console.log( response.headers)
      return response.text();
    })
    .then(result => {
      if(result.includes(`Too Many Requests`))
         console.log(counter + ' - 409');
        else
        console.log(counter + " - OK")
    })
    .catch(error => {
      console.error('Error sending request:', error);
    });
}

// Función que controla el envío de las peticiones con el ratio especificado
function startSendingRequests(ratio) {
  const interval = 1000 / ratio; // Intervalo de tiempo en milisegundos entre cada petición
  setInterval(sendRequest, interval);
}

// Iniciar el envío de peticiones con el ratio especificado
startSendingRequests(ratioPerSecond);
