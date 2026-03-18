export function openLudoKing() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  if (isIOS) {
    window.location.href = 'ludoking://'
    setTimeout(() => {
      window.location.href = 'https://apps.apple.com/app/ludo-king/id993090598'
    }, 2000)
  } else {
    window.location.href = 'intent://com.ludo.king/#Intent;scheme=ludoking;package=com.ludo.king;end'
    setTimeout(() => {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.ludo.king'
    }, 2000)
  }
}
