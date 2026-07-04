package report

// TLSLayerInfo describes one hop of the connection (client→edge or edge→backend).
type TLSLayerInfo struct {
	Role        string `json:"role"` // client | backend
	Encrypted   bool   `json:"encrypted"`
	HTTPVersion string `json:"http_version"`
	TLSVersion  string `json:"tls_version"`
	CipherSuite string `json:"cipher_suite"`
	ALPN        string `json:"alpn"`
	Source      string `json:"source"` // direct | forwarded | proxy_terminated | unavailable | outbound_probe
	Label       string `json:"label"`  // i18n key when tls_version is not available
	Note        string `json:"note"`   // i18n key explaining limitations
}

// TLSDiagnostics educates users when TLS is terminated at a reverse proxy.
type TLSDiagnostics struct {
	BehindReverseProxy bool         `json:"behind_reverse_proxy"`
	ProxySignals       []string     `json:"proxy_signals"`
	Client             TLSLayerInfo `json:"client"`
	Backend            TLSLayerInfo `json:"backend"`
	HSTS               bool         `json:"hsts"`
	HSTSHeader         string       `json:"hsts_header,omitempty"`
	HTTP3Available     bool         `json:"http3_available"`
	ExplanationKey     string       `json:"explanation_key"`
}
