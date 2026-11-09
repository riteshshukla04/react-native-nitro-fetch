package com.margelo.nitro.nitrofetch

import org.chromium.net.CronetEngine
import org.chromium.net.UrlResponseInfo as CronetUrlResponseInfo
import org.chromium.net.CronetException as CronetNativeException
import org.chromium.net.NetworkException

private const val ERR_INVALID_URL = -300

fun CronetUrlResponseInfo.toNitro(): UrlResponseInfo {
  val headersMap = mutableMapOf<String, String>()
  val headersList = mutableListOf<HttpHeader>()

  allHeadersAsList.forEach { header ->
    headersMap[header.key] = header.value
    headersList.add(HttpHeader(key = header.key, value = header.value))
  }

  return UrlResponseInfo(
    url = url,
    httpStatusCode = httpStatusCode.toDouble(),
    httpStatusText = httpStatusText ?: "",
    allHeaders = headersMap,
    allHeadersAsList = headersList.toTypedArray(),
    urlChain = urlChain.toTypedArray(),
    negotiatedProtocol = negotiatedProtocol,
    proxyServer = proxyServer,
    receivedByteCount = receivedByteCount.toDouble(),
    wasCached = wasCached()
  )
}

fun CronetNativeException.toNitro(url: String): RequestException {
  if (isInvalidUrl) return RequestException(message = "Invalid URL: $url")
  return RequestException(message = message ?: "Unknown Cronet error")
}

val CronetNativeException.isInvalidUrl: Boolean
  get() = this is NetworkException && cronetInternalErrorCode == ERR_INVALID_URL

fun invalidUrlException(url: String) = IllegalArgumentException("Invalid URL: $url")

fun hostHasWhitespace(url: String): Boolean {
  val schemeEnd = url.indexOf("://")
  if (schemeEnd < 0) return false
  val authorityStart = schemeEnd + 3
  var authorityEnd = url.length
  for (i in authorityStart until url.length) {
    val c = url[i]
    if (c == '/' || c == '?' || c == '#') {
      authorityEnd = i
      break
    }
  }
  val at = url.lastIndexOf('@', authorityEnd - 1)
  val hostStart = if (at >= authorityStart) at + 1 else authorityStart
  for (i in hostStart until authorityEnd) {
    if (url[i] <= ' ' || url[i] == '\u007f') return true
  }
  return false
}

val NitroRequestPriority.cronetPriority: Int
  get() = when (this) {
    NitroRequestPriority.HIGH -> org.chromium.net.UrlRequest.Builder.REQUEST_PRIORITY_HIGHEST
    NitroRequestPriority.LOW -> org.chromium.net.UrlRequest.Builder.REQUEST_PRIORITY_LOW
  }

fun CronetEngine.Builder.enableConfiguredHttpCache(): CronetEngine.Builder {
  val sizeMB = BuildConfig.NITRO_FETCH_HTTP_CACHE_SIZE_MB
  return if (sizeMB > 0) {
    enableHttpCache(CronetEngine.Builder.HTTP_CACHE_DISK, sizeMB * 1024L * 1024L)
  } else {
    enableHttpCache(CronetEngine.Builder.HTTP_CACHE_DISABLED, 0)
  }
}

/**
 * Retires a Cronet engine that was replaced (e.g. after the pin config changed at runtime).
 * `shutdown()` throws while requests are in flight, so those engines are retried in the background and
 * their requests finish on the old pins. Returns true if the engine was shut down immediately, which
 * is also when its storage path is free for the replacement engine to use.
 */
internal fun retireCronetEngine(engine: CronetEngine): Boolean {
  try {
    engine.shutdown()
    return true
  } catch (_: IllegalStateException) {
    // Requests still running; retry below.
  }
  Thread({
    var attempts = 0
    while (attempts++ < 120) {
      Thread.sleep(1000)
      try {
        engine.shutdown()
        return@Thread
      } catch (_: IllegalStateException) {
      }
    }
  }, "NitroFetch-engine-retire").apply { isDaemon = true }.start()
  return false
}
