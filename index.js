async function signal() {
  const payload = {
    url: document.location.href,
    name: "beacon",
    description: "test description",
    active: true
  };
  await fetch('http://localhost:8000/beacon', {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
signal();