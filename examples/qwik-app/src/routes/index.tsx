import { component$ } from '@builder.io/qwik'
import type { DocumentHead } from '@builder.io/qwik-city'

export default component$(() => {
  return (
    <>
      <h1>H! Qwik!!</h1>
      <p>Served by Wrangler</p>
    </>
  )
})

export const head: DocumentHead = {
  title: 'Welcome to Qwik!',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description'
    }
  ]
}
