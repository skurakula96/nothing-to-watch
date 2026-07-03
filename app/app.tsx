import { Navbar, ThemeProvider } from './cmps/layout'
import { CatalogBootstrap } from './cmps/app-bootstrap'
import PrimaryViews from './cmps/views'
import { Intro } from './cmps/views/intro'

const App = () => (
  <ThemeProvider>
    <CatalogBootstrap />
    <Navbar />
    <PrimaryViews />
    <Intro />
  </ThemeProvider>
)

export default App
