import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let targetURL: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptCanOpenWindowsAutomatically = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = true
        webView.allowsBackForwardNavigationGestures = true

        let request = URLRequest(url: targetURL)
        webView.load(request)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
    }
}

struct ContentView: View {
    let appURL = URL(string: "https://training-calendar-lemon.vercel.app")!

    var body: some View {
        ZStack {
            Color(red: 0.06, green: 0.09, blue: 0.16)
                .ignoresSafeArea()

            WebView(targetURL: appURL)
                .edgesIgnoringSafeArea(.all)
        }
    }
}
