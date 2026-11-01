import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Terraviva Procurement System',
    short_name: 'Terraviva',
    description: 'Requisitions, approvals, purchase orders and deliveries for Terraviva.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f8ee',
    theme_color: '#063f43',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'New requisition', url: '/requisitions/new' },
      { name: 'Approvals', url: '/approvals' },
      { name: 'Receive goods', url: '/grns/new' },
    ],
  };
}
