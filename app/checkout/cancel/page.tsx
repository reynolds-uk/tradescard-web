export default function CancelPage() {
  return (
    <main className="p-8">
      <h1>Payment cancelled</h1>
      <p>No charge was made. You can try again any time.</p>
      <a href="/" style={{ textDecoration: 'underline' }}>Back to home</a>
    </main>
  );
}