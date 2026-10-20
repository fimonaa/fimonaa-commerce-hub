import { useEffect, useState } from 'react'

import DashboardPage from '../features/dashboard/pages/DashboardPage'
import InventoryPage from '../features/inventory/pages/InventoryPage'

type AppPage = 'dashboard' | 'inventory'

// Resolve the current page from the URL so a page can be refreshed
// or opened directly in the browser.
function getCurrentPage(): AppPage {
  return window.location.pathname.startsWith('/inventory')
    ? 'inventory'
    : 'dashboard'
}

function App() {
  const [page, setPage] = useState<AppPage>(getCurrentPage)

  useEffect(() => {
    // Respond to browser Back and Forward navigation.
    const handlePopState = () => setPage(getCurrentPage())

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function navigateTo(nextPage: AppPage) {
    const path = nextPage === 'inventory' ? '/inventory' : '/'

    // Update the URL without forcing a full browser reload.
    window.history.pushState({}, '', path)
    setPage(nextPage)
  }

  if (page === 'inventory') {
    return <InventoryPage onNavigate={navigateTo} />
  }

  return <DashboardPage onNavigate={navigateTo} />
}

export default App