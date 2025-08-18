import './globals.css';

export const metadata = {
  title: 'Vortex',
  description: 'C++/Wasm Image Editor',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
