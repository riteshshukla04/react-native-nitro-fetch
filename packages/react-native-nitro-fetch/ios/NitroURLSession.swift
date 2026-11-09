import Foundation

/// Handles server-trust challenges for pinned hosts, and keeps authentication challenges observable
/// by delegate-based networking middleware.
private final class NitroPinningURLSessionDelegate: NSObject, URLSessionDelegate {
  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    if !CertificatePinning.handle(challenge, completion: completionHandler) {
      completionHandler(.performDefaultHandling, nil)
    }
  }
}

enum NitroURLCache {
  static let shared = URLCache(
    memoryCapacity: 32 * 1024 * 1024,
    diskCapacity: 100 * 1024 * 1024,
    diskPath: "nitrofetch_urlcache"
  )
}

enum NitroURLSession {
  static let shared = make(configuration: .default)

  static func make(configuration: URLSessionConfiguration) -> URLSession {
    // Pins can be set from JS after the session exists, so the pinning delegate is always attached.
    // It answers with default handling for hosts that aren't pinned.
    let delegate: URLSessionDelegate = NitroPinningURLSessionDelegate()
    return URLSession(
      configuration: configuration,
      delegate: delegate,
      delegateQueue: nil
    )
  }
}
