async function signal() {
  const url = document.head.querySelector('meta[data-canonical-url]')?.getAttribute('data-canonical-url');
  const name = document.head.querySelector('meta[name="application-name"]')?.getAttribute('content');
  const description = document.head.querySelector('meta[name="description"]')?.getAttribute('content');
  if (!url || !name || !description) {
    console.error("Missing required metadata! Check your <meta> tags for the following attributes: data-canonical-url, name=application-name, name=description");
    return;
  }
  const payload = {
    url,
    name,
    description,
    active: true
  };
  // await fetch('https://relay-dev.zesty.xyz/beacon', {
  //   method: 'PUT',
  //   body: JSON.stringify(payload),
  //   headers: {
  //     'Content-Type': 'application/json'
  //   }
  // });
  // await fetch('https://relay-dev2.zesty.xyz/test_follow', {
  //   method: 'POST',
  //   body: "relay@relay-dev.zesty.xyz",
  // });
}
signal();