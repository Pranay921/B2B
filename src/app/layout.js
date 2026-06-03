import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata = {
  title: 'Assam EdChem B2B Platform',
  description: 'Enterprise Inventory, Quotation, and Order Management Platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
