import { installMockApi } from './lib/mockServer'
import ApiConfigManager from './lib/apiConfig'

console.log('[Setup] Initializing application')
console.log('[Setup] Current API mode:', ApiConfigManager.getMode())

if (ApiConfigManager.isMockApiMode()) {
  console.log('[Setup] Installing mock API interceptors')
  installMockApi()
} else {
  console.log('[Setup] Real API mode - mock interceptors not installed')
}

ApiConfigManager.onModeChange((mode) => {
  console.log('[Setup] API mode changed to:', mode)
  if (mode === 'mock') {
    console.log('[Setup] Reloading page to install mock interceptors')
    window.location.reload()
  } else if (mode === 'real') {
    console.log('[Setup] Reloading page to remove mock interceptors')
    window.location.reload()
  }
})


