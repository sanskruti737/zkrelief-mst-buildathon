import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { Shield, Users, FileCheck, BarChart3, Info } from 'lucide-react'
import Overview from './pages/Overview'
import CreateCampaign from './pages/CreateCampaign'
import ClaimAid from './pages/ClaimAid'
import PublicAudit from './pages/PublicAudit'
import About from './pages/About'
import { WalletProvider } from './context/WalletContext'

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen">
          <nav className="bg-navy-800/80 backdrop-blur-md border-b border-blue-500/30 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-teal-500" />
                  <span className="ml-2 text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                    ZKRelief
                  </span>
                  <span className="ml-3 text-sm text-gray-400">Private Aid. Public Accountability.</span>
                </div>
                <div className="flex space-x-4">
                  <NavLink to="/" icon={<BarChart3 className="h-4 w-4" />}>Overview</NavLink>
                  <NavLink to="/create" icon={<Users className="h-4 w-4" />}>Create Campaign</NavLink>
                  <NavLink to="/claim" icon={<FileCheck className="h-4 w-4" />}>Claim Aid</NavLink>
                  <NavLink to="/audit" icon={<Shield className="h-4 w-4" />}>Public Audit</NavLink>
                  <NavLink to="/about" icon={<Info className="h-4 w-4" />}>About & Privacy</NavLink>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/create" element={<CreateCampaign />} />
              <Route path="/claim" element={<ClaimAid />} />
              <Route path="/audit" element={<PublicAudit />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  )
}

function NavLink({ to, icon, children }: { to: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-navy-700 hover:text-white transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}

export default App
