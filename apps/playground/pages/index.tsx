import Head from 'next/head'
import dynamic from 'next/dynamic'

const PlaygroundScene = dynamic(() => import('../components/PlaygroundScene'), {
  ssr: false
})

export default function Home() {
  return (
    <>
      <Head>
        <title>WebGL Tools Playground</title>
        <meta name="description" content="Test and demo WebGL debugging toolkit" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <PlaygroundScene />
    </>
  )
}