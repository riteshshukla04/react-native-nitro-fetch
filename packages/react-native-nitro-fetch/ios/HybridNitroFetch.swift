import Foundation

final class HybridNitroFetch: HybridNitroFetchSpec {
  func createClient() throws -> (any HybridNitroFetchClientSpec) {
    return HybridNitroFetchClient()
  }

  func setCertificatePinning(configJson: String) throws {
    try CertificatePinning.set(json: configJson)
  }

  func reloadCertificatePinning() throws {
    try CertificatePinning.reload()
  }
}

