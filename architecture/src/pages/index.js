import { useEffect } from 'react'
import Layout from '@theme/Layout'

// 首页直接进入学习大纲（唯一学习入口）；客户端跳转，SSR 渲染空态
export default function Home() {
  useEffect(() => {
    window.location.replace('/软件架构学习大纲')
  }, [])
  return (
    <Layout>
      <div style={{ padding: '2rem' }}>正在进入学习大纲…</div>
    </Layout>
  )
}
