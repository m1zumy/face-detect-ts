"use client"

import React, {useRef, useEffect, useState} from 'react'
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'


const Home = () => {

  const [direcao, setDirecao] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  //use effect tlgd
  useEffect(() => {

    const streamPromise = navigator.mediaDevices.getUserMedia({ video: {
      facingMode: "user", //environment ou true
      width: 1200,
      height: 1000,
      frameRate: { ideal: 30, max: 30} //posso habilitar sem ideal e max mas seria menos incluisvo
    } })

    streamPromise
    .then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream
    })
    .catch((error) => console.error("não consegui acessar a sua webcam", error))

  return () => {
    streamPromise.then((stream) => stream.getTracks().forEach((track) => track.stop())).catch(() => {})
  }
}, [])

useEffect(() => {
  let frameID = 0
  let ultimoTempoVideo = -1

  const detectorPromise = FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm"
  ).then((vision) => 
  FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 
      "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "CPU"
    },
    runningMode: "VIDEO"
  })
)

  detectorPromise.then((detector) => {
    const detect = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (video && canvas && ctx && video.readyState >= 2 && video.currentTime !== ultimoTempoVideo) {
        ultimoTempoVideo = video.currentTime
        const resultado = detector.detectForVideo(video, performance.now())

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.strokeStyle = "lime"
        ctx.fillStyle = "lime"
        ctx.lineWidth = 4
        ctx.font = "24px sans-serif"

        for (const { boundingBox, categories, keypoints } of resultado.detections) {
          if(!boundingBox) continue
          ctx.strokeRect(boundingBox.originX, boundingBox.originY, boundingBox.width, boundingBox.height)
          ctx.fillText(`${Math.round(categories[0].score * 100)}%`, boundingBox.originX, boundingBox.originY - 8)
          //keypoints
          for (const {x , y } of keypoints ) {
            ctx.beginPath()
            ctx.arc(x * canvas.width, y * canvas.height, 6, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        const rosto = resultado.detections[0]
        if (rosto) {
          const [olho1, olho2, nariz] = rosto.keypoints
          const desvio = (nariz.x - (olho1.x + olho2.x) / 2) / Math.abs(olho1.x - olho2.x)
          setDirecao(desvio > 0.2 ? "Olhando para a esquerda" : desvio < -0.2 ? "Olhando para a direita" : "Olhando para frente")
        } else setDirecao("Nenhum rosto")
        console.log(resultado.detections)
      }
      frameID = requestAnimationFrame(detect)
    }
    detect()
  })
  .catch((error) => console.error("Nao foi possivel criar o detector: ", error))

  return () => {
    detectorPromise
      .then((detector) => {
        cancelAnimationFrame(frameID)
        detector.close()
      })
      .catch(() => {})
  }
}, [])

  return (
    <>
    <div className='relative w-full mx-auto max-w-2xl mt-48'>
    <video ref={videoRef} autoPlay playsInline muted className='block w-full'></video>
    <canvas ref={canvasRef} className='absolute inset-0 w-full h-full'></canvas>
    </div>
    <p className='text-center text-xl mt-4'>{direcao}</p>
    </>
  )

}

export default Home