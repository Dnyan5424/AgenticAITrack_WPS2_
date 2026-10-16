export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { cream:'#F7F5F0', soft:'#F1EEE7', inset:'#F8F7F3', dot:'#E7E2D9', ink:'#17202A', ink2:'#52606D', mute:'#7B8794',
      teal:{ DEFAULT:'#0F766E', hover:'#115E59', light:'#E5F4F1' }, amber:{ DEFAULT:'#D97706', light:'#FFF2DB' },
      ok:'#15803D', part:'#B45309', none:'#64748B', review:'#1D4ED8', err:'#B91C1C', line:'#E3DFD5' },
    fontFamily: { sans:['Inter','system-ui','sans-serif'], head:['Sora','Inter','sans-serif'], mono:['JetBrains Mono','ui-monospace','monospace'] },
    boxShadow: { card:'0 6px 24px -10px rgba(23,32,42,.14)' }, borderRadius: { xl2:'16px' } } },
  plugins: [] }
