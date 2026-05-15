'use client'

import { useEffect, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { analyzeModel, verifyPivot, type ModelInfo } from '@/lib/three/modelUtils'

interface ModelInspectorProps {
  modelPath: string
  onAnalysisComplete?: (info: ModelInfo) => void
}

export function ModelInspector({ modelPath, onAnalysisComplete }: ModelInspectorProps) {
  const { scene } = useGLTF(modelPath)
  const [info, setInfo] = useState<ModelInfo | null>(null)

  useEffect(() => {
    if (scene) {
      const modelInfo = analyzeModel(scene)
      const pivotInfo = verifyPivot(scene)

      console.group('🔍 Watch Model Analysis')
      console.log('📦 Bounding Box:', {
        size: modelInfo.boundingBox.size,
        center: modelInfo.boundingBox.center,
      })
      console.log('📐 Geometry:', {
        totalVertices: modelInfo.totalVertices,
        totalTriangles: modelInfo.totalTriangles,
        meshCount: modelInfo.meshes.length,
      })
      console.log('🎨 Materials:', modelInfo.materials)
      console.log('🎯 Pivot:', pivotInfo)
      console.log('📊 Meshes:', modelInfo.meshes)
      console.groupEnd()

      setInfo(modelInfo)
      onAnalysisComplete?.(modelInfo)
    }
  }, [scene, onAnalysisComplete])

  return null
}
