import Home from './Home'
import { render as renderPreact } from 'preact-render-to-string'

export const render = async (url: string) => {
  return renderPreact(<Home />)
}
