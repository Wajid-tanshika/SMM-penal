(function () {
  if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  document.head.appendChild(script);
})();
