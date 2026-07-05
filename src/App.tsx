import { RouterProvider } from 'react-router-dom'
import { BrandProvider } from './components/BrandProvider'
import { AuthProvider } from './components/AuthProvider'
import { ToastHost } from './components/Toast'
import { router } from './router'

function App() {
  return (
    <BrandProvider>
      <ToastHost>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastHost>
    </BrandProvider>
  )
}

export default App
