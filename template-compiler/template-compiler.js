const fs = require('fs');
const path = require('path');
const glob = (require('glob')).glob;
const { JSDOM } = require('jsdom');

// Directorio de trabajo
const workspaceDir = '.';
// Directorio para guardar los archivos compilados
const compiledDir = `${fs.realpathSync(workspaceDir)}\\compiled`;

ensureCompiledDir(compiledDir)

// Crear carpeta "compiled" si no existe
function ensureCompiledDir(dir) {

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Buscar todos los archivos .xml recursivamente
 function findXmlFiles(dir) {
  return  fs.readdirSync(dir, { recursive: true })
 
}

// Función para leer un archivo de forma síncrona
function readFileSync(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf-8');
  } else {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
}

// Procesar un archivo XML y buscar las etiquetas <include>
async function processXmlFile(filePath) {
  let xmlContent = readFileSync(filePath);

  // Parsear el XML
  const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
  const document = dom.window.document;

  const includes = document.querySelectorAll('include');
  for (const include of includes) {
    const packageAttr = include.getAttribute('package');
    const nameAttr = include.getAttribute('name');

    if (packageAttr && nameAttr) {
      // Construir la ruta del archivo de inclusión
      const includeFilePath = fs.realpathSync(workspaceDir + "\\" +  packageAttr + `\\${nameAttr}.inc.xml`);

      try {
        const includeContent = readFileSync(includeFilePath);
        console.log(`Incluyendo contenido del archivo: ${includeFilePath}`);

        // Crear un nodo temporal con el contenido del archivo de inclusión
        const includeDom = new JSDOM(includeContent, { contentType: 'text/xml' });
        const includeDocument = includeDom.window.document;

        // Reemplazar la etiqueta <include> con el contenido del archivo de inclusión
        include.replaceWith(...includeDocument.childNodes);

      } catch (error) {
        console.error(error.message);
      }
    }
  }

  // Guardar el archivo XML con las inclusiones procesadas en la carpeta "compiled"
  const newXmlContent = dom.serialize();
  // extrat file name from filePath
  const fileName = filePath.split("\\").pop();

  fs.writeFileSync(compiledDir + "\\" + fileName, newXmlContent);
  console.log(`Archivo procesado y guardado en: ${compiledDir}`);
}

// Procesar todos los archivos encontrados
async function compileXmlWorkspace() {
  try {
    const files =  findXmlFiles(fs.realpathSync(workspaceDir))
    .filter(file => file.endsWith('.xml'))
    .map(file => path.join(workspaceDir, file));
    console.log(files)
    for (const file of files) {
      console.log(`Procesando archivo: ${file}`);
      await processXmlFile(file);
    }
  } catch (error) {
    console.error('Error procesando archivos XML:', error);
  }
}


// Ejecutar el compilador
compileXmlWorkspace();
