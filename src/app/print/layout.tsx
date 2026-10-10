export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-white text-black print:bg-white">{children}</div>;
}
