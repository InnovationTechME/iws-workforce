import './globals.css'
export const metadata = { title: 'IWS — Innovation Workforce System', description: 'Internal workforce management for Innovation Technologies' }
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
