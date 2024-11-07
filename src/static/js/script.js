const video = document.getElementById('video');
var progressValue = 0;
const statusText = document.getElementById('status');
let currentStatus = null;
let statusChangeTimeout;
const startCam = document.getElementById('startCam');
const stopCam = document.getElementById('stopCam');
const rstSelfieButton = document.getElementById('rstSelfie');
let stream = null;


let isValid_face_validate = false;
let isValid_face_search = false;
let isValid_face_upload = false;



// Token de autenticação
const API_KEY = '3PgqC7CcWYFVyCUFp3ujAr7vyVQskg3yMU';


let checkFacial = false;
let checkRegister = false;
let doneRegister = false;
let isRunning = false;


function startVideo() {
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('../models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('../models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('../models'), 
    faceapi.nets.faceExpressionNet.loadFromUri('../models')
  ]).then(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then(function(mediaStream) {
        stream = mediaStream;
        video.srcObject = stream;
        //startButton.disabled = true;
        //stopButton.disabled = false;
      })
      .catch(error => console.error("Erro ao acessar a câmera:", error));
  });
}

function stopVideo() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    //startButton.disabled = false;
    //stopButton.disabled = true;
  }
}
async function start() {
  console.log('start');

  isRunning = true;  // Marca o processo como iniciado

  await startVideo();

  // Aguarda até que o vídeo esteja totalmente carregado
  video.addEventListener('loadeddata', () => {
    video.play();
    
    video.addEventListener('play', () => {
      const canvas = faceapi.createCanvasFromMedia(video);
      document.body.append(canvas);
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);

      const interval = setInterval(async () => {
        const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320 }))
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections) {
          canvas.getContext('2d', { willReadFrequently: true }).clearRect(0, 0, canvas.width, canvas.height);

          const detection = detections.detection;
          let alignmentQuality = 100;

          const isFaceVisible = checkFaceFeaturesPresence(detection);
          const hascheckLighting = checkLighting(video);

          if (!isFaceVisible) alignmentQuality -= 10;
          if (!hascheckLighting) alignmentQuality -= 10;

          alignmentQuality = Math.max(0, alignmentQuality);

          progressValue = alignmentQuality.toFixed(0);
          updateProgressBar(progressValue);
          updateProgress(progressValue);

          if (isFaceVisible && hascheckLighting) {
            //console.log('ok')
            //captureImage(video);
          }
          console.log('ok')
          await checkAndCapture(isFaceVisible, hascheckLighting)


        }
      }, 500);

      function stop() {
        isRunning = false;
        clearInterval(interval);
        console.log("Processo interrompido");
      }
    });
  });
}


async function checkAndCapture(isFaceVisible, hascheckLighting) {
  if (isFaceVisible && hascheckLighting) {

    captureTimeout = setTimeout(async () => {
      // Verifica novamente as condições
      if (isFaceVisible && hascheckLighting) {
        console.log('Conditions are still good. Capturing image...');
        captureImage(video);
      } else {
        console.log('Conditions not met anymore. Skipping capture.');
      }
    }, 5000); // 3 segundos
  }
}

function stopCaptureTimeout() {
  clearTimeout(captureTimeout);
  console.log('Capture timeout stopped.');
}




function checkLighting(videoElement) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = 1;
  canvas.height = 1;
  context.drawImage(videoElement, 0, 0, 1, 1);

  const frameData = context.getImageData(0, 0, 1, 1).data;
  const brightness = (frameData[0] + frameData[1] + frameData[2]) / 3;
  const minBrightness = 130;

  if (brightness < minBrightness) {
    $('#check-lighting').addClass('warning');
    return false;
  } else {
    $('#check-lighting').removeClass('warning');
    $('#check-lighting').addClass('success');
    return true;
  }
}


function checkFaceFeaturesPresence(landmarks) {
  const score = landmarks['_score'];
  let newStatus;

  if (score > 0.80) {
    newStatus = 'success';
  } else if (score >= 0.30 && score <= 0.79) {
    newStatus = 'warning';
  } else {
    newStatus = 'danger';
  }

  if (newStatus !== currentStatus) {
    clearTimeout(statusChangeTimeout);

    statusChangeTimeout = setTimeout(() => {
      $('#check-face').removeClass('success warning danger').addClass(newStatus);
      currentStatus = newStatus;
    }, 150);
  }

  return newStatus === 'success';
}


function captureImage(video) {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth / 2;
  canvas.height = video.videoHeight / 2;
  const context = canvas.getContext('2d');
  //context.drawImage(video, 0, 0, canvas.width, canvas.height);

  
  drawZoomedVideo(context, video, 1.4);

  //context.putImageData(new ImageData(outputData, width, height), 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg');

  //const zoomedFile = zoomImage(dataUrl, 2); 
  
  invisivelCam(dataUrl);



  const blob = dataUrlToBlob(dataUrl);


  
  const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  let fileName = Math.floor((Math.random() * 1000000) + 1);
  processPhoto(file, 'barretos-2024', fileName)


}


function drawZoomedVideo(context, video, zoomFactor) {


  applySharpness(context);

  // Calcula a área central para aplicar o zoom
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const zoomedWidth = videoWidth / zoomFactor;
  const zoomedHeight = videoHeight / zoomFactor;
  const offsetX = (videoWidth - zoomedWidth) / 2;
  const offsetY = (videoHeight - zoomedHeight) / 2;

  // Desenha a imagem do vídeo com o zoom aplicado no canvas
  context.drawImage(
    video,
    offsetX, offsetY, zoomedWidth, zoomedHeight, // Área de origem no vídeo com zoom
    0, 0, context.canvas.width, context.canvas.height // Desenha para preencher o canvas
  );
}

function applySharpness(context) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const imageData = context.getImageData(0, 0, width, height); // Pega os dados de imagem do canvas
  const data = imageData.data;

  // Kernel de nitidez básico 3x3 (aplica nitidez com o método de filtro de convolução)
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0
  ];
  const weight = kernel.reduce((a, b) => a + b, 0) || 1;  // Soma para normalização

  // Cria um buffer para a imagem de saída
  const outputData = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0, a = 0;

      // Aplica o kernel de nitidez aos pixels ao redor do pixel central
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const weight = kernel[(ky + 1) * 3 + (kx + 1)];
          const px = ((y + ky) * width + (x + kx)) * 4;
          r += data[px] * weight;
          g += data[px + 1] * weight;
          b += data[px + 2] * weight;
          a += data[px + 3];
        }
      }

      // Defina os valores RGB ajustados no pixel atual
      const index = (y * width + x) * 4;
      outputData[index] = Math.min(Math.max(r / weight, 0), 255);
      outputData[index + 1] = Math.min(Math.max(g / weight, 0), 255);
      outputData[index + 2] = Math.min(Math.max(b / weight, 0), 255);
      outputData[index + 3] = data[index + 3];  // Mantém o valor alpha original
    }
  }

  // Cria um novo objeto ImageData com a imagem nítida
  const newImageData = new ImageData(outputData, width, height);

  // Coloca a imagem processada de volta no canvas
  context.putImageData(newImageData, 0, 0);
}

function visivelCam(){
  $('#shot').attr('src', '').css('display', 'none');
  $('#cam').css('display', 'block');
  $('.btns').css('display', 'block');
  $('.btnsSystem').css('display', 'none');
  $('.valids').css('display', 'block');

  $('#msgCam').html('');
  $('#msgCam').css('display', 'none');
  $('#rstSelfie').css('display', 'none');
}

function invisivelCam(dataUrl){
  stopVideo();
  $('#shot').attr('src', dataUrl).css('display', 'block');
  $('#cam').css('display', 'none');
  $('.btns').css('display', 'none');
  $('.btnsSystem').css('display', 'none');
  $('.valids').css('display', 'block');
  $('#rstSelfie').css('display', 'block');
}

function restartCapture(){
  
console.log('restartCapture')
  progressValue = 0;

  currentStatus = null;
  stream = null;

  checkFacial = false;
  checkRegister = false;
  doneRegister = false;


  $('#shot').css('display', 'none');
  $('#cam').css('display', 'block');
  $('.btns').css('display', 'block');
  $('.btnsSystem').css('display', 'none');
  $('.valids').css('display', 'none');

  setIconStatus('icon-facial', 'initial');
  setIconStatus('icon-register', 'initial');
  setIconStatus('icon-register-done', 'initial');

  updateProgressBar(0)

  updateProgress(0);
  $('#check-lighting').removeClass('success warning danger');
  $('#check-face').removeClass('success warning danger');

  start();
  
}

rstSelfieButton.addEventListener('click', () => {
  visivelCam()
  restartCapture();
});

function dataUrlToBlob(dataUrl) {
  const [header, base64Data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const byteCharacters = atob(base64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
    const slice = byteCharacters.slice(offset, offset + 1024);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mime });
}

function updateProgress() {
    if (progressValue !== "" && !isNaN(progressValue) && progressValue <= 100 && progressValue >= 0) {
    var valOrig = progressValue;
    $(".progress").parent().removeClass();
    if (valOrig > 90 * 1) {
      $(".progress").parent().addClass("green");
    } else if (valOrig >=30 && valOrig <= 90) {
      $(".progress").parent().addClass("orange");
    } else {
      $(".progress").parent().addClass("red");
    }
  } else {
    $(".progress").parent().removeClass();
    $(".progress").parent().addClass("red");
  }
}

function updateProgressBar(percentage) {
  let text;

  if (percentage < 30) {
    text = 'Se posicione';
  } else if (percentage >= 70 && percentage < 90) {
    text = 'Quase lá';
  } else if (percentage >= 90 && percentage < 100) {
    text = 'Tente ficar parado';
  } else if (percentage >= 100) {
    text = 'Capturando';
  } else {
    text = `${percentage}%`;
  }

  $('#progressWait')
    .css('width', `${percentage}%`)
    .text(text);
}


//stopCam.addEventListener('click', stopVideo);


function setIconStatus(id, status) {
  const icon = document.getElementById(id);
  
  icon.classList.remove('initial', 'done', 'error');

  switch (status) {
    case 'initial':
      icon.classList.add('initial');
      break;
    case 'done':
      icon.classList.add('done');
      break;
    case 'error':
      icon.classList.add('error');
      break;
    default:
      icon.classList.add('initial');
  }
}

// Função para enviar a imagem para a etapa de validação facial
function face_validate(filePhoto) {
  
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', filePhoto);

    function attemptRequest() {
      $.ajax({
        url: 'https://api.newcash.com.br/face-validate/',
        method: 'POST',
        headers: {
          'X-API-KEY': API_KEY
        },
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
          console.log("Resultado face_validate:", response);

          if (response.success === false) {
            $('#msgCam').html(response.message);
            $('#msgCam').css('display', 'block');

            resolve(false);
          } else {
            addItemToList('../static/img/check.png', 'Analise facial', 'done');
            isValid_face_validate = true;
            resolve(true); 
          }
        },
        error: function(xhr, status, error) {
          if (status === '0') {
            console.log("Erro de conexão, tentando novamente...");
            attemptRequest(); 
          } else {
            setIconStatus('icon-facial', 'error');
            resolve(false);
          }
        }
      });
    }

    // Inicia a tentativa de requisição
    attemptRequest();
  });
}

// Função para enviar a imagem para a etapa de busca facial
function face_search(filePhoto, eventName) {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('image', filePhoto);

    $.ajax({
      url: 'https://api.newcash.com.br/event-face-search/?event=' + eventName,
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'accept': 'application/json'
      },
      data: formData,
      processData: false,
      contentType: false,
      success: function(response) {
        addItemToList('../static/img/check.png', 'Buscando Facial', 'done');

        if (response.success === false) {
          addItemToList('../static/img/check.png', 'Facial não encontrada', 'done');
          resolve(true);
          isValid_face_search = true;

          resolve(false);
        } else {
          addItemToList('../static/img/check.png', 'Facial encontrada', 'warning');
            $('#msgCam').html(response.message);
            $('#msgCam').css('display', 'block');
          isValid_face_search = true;
        }
      },
      error: function(xhr, status, error) {
        if (status === '0') {
          console.log("Erro de conexão, tentando novamente...");
          attemptRequest(); 
        } else {
          setIconStatus('icon-facial', 'error');
          resolve(false);
        }
      }
    });
  });
}

// Função para enviar a imagem para a etapa de upload
function face_upload(filePhoto, eventName, photoName) {
  return new Promise((resolve) => {
    $.ajax({
      url: '/face_upload',
      method: 'POST',
      headers: { 'X-API-KEY': API_KEY }, // Autenticação
      data: { 
        photo: filePhoto,
        collection_name: collectionName,
        photo_name: photoName
      },
      success: function(response) {
        console.log("Resultado face_upload:", response);
        resolve(true); // Sucesso ao fazer upload
      },
      error: function(error) {
        console.error("Erro na face_upload:", error);
        resolve(false); // Retornar false para retentar
      }
    });
  });
}

// Função principal para controlar o fluxo entre face_validate, face_search, e face_upload
async function processPhoto(file, eventName, photoName) {
  try {
    showList();
    // Executa a validação de rosto primeiro
    if (!isValid_face_validate) {
      const validateSuccess = await face_validate(file);
      if (!validateSuccess) {
        console.log("face_validate falhou.");
        return; // Para o processo se a validação falhar
      }else{
        
      }
    }

    // Executa a pesquisa de rosto em seguida
    if (!isValid_face_search) {
      const searchSuccess = await face_search(file, eventName);
      if (!searchSuccess) {
        console.log("face_search falhou.");
        return; // Para o processo se a pesquisa falhar
      }
    }

    // Executa o registro rosto em seguida
    if (!isValid_face_upload) {
      const uploadSuccess = await face_upload(file, eventName, photoName);
      if (!uploadSuccess) {
        console.log("face_upload falhou.");
        return; // Para o processo se a pesquisa falhar
      }
    }

    console.log("Processo de validação e pesquisa bem-sucedido!");

  } catch (error) {
    console.error("Erro durante o processo:", error);
  }
}

// Função para adicionar um item à lista
function addItemToList(iconSrc, text, color) {
  // Obtenha a referência do contêiner da lista
  const list = document.getElementById('action-list');
  
  // Crie um novo item da lista
  const listItem = document.createElement('li');
  listItem.classList.add('list-group-item', 'd-flex', 'list-check', 'align-items-center');
  
  // Crie a imagem
  const icon = document.createElement('img');
  icon.src = iconSrc;
  icon.width = 20; // Tamanho da imagem
  icon.classList.add('me-2', color);

  // Crie o texto do item
  const span = document.createElement('span');
  span.textContent = text;

  // Adicione a imagem e o texto ao item da lista
  listItem.appendChild(icon);
  listItem.appendChild(span);

  // Adicione o item à lista
  list.appendChild(listItem);
}

function showList() {
  const list = document.getElementById('action-list');
  list.style.display = 'block';
}


startCam.addEventListener('click', start);
//start();