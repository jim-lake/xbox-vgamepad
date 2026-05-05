function App() {
  return (
    <div>
      <div>Xbox Virtual Gamepad v8</div>
      <div>Version: {window.__VERSION__ ?? 'dev'}</div>
    </div>
  );
}

console.log('window:', window.__VERSION__);

export default App;
