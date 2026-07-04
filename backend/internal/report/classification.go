package report

// ClassificationSignal is one piece of evidence toward a connection category.
type ClassificationSignal struct {
	Key      string `json:"key"`
	Category string `json:"category"` // residential | vpn | hosting | mobile | corporate
	Weight   int    `json:"weight"`
	Supports bool   `json:"supports"`
}

// ProviderClassificationContribution shows how one provider influenced the result.
type ProviderClassificationContribution struct {
	ID       string                 `json:"id"`
	Name     string                 `json:"name"`
	Active   bool                   `json:"active"`
	Queried  bool                   `json:"queried"`
	Signals  []ClassificationSignal `json:"signals"`
}

// ConnectionClassification is the multi-provider consensus output.
type ConnectionClassification struct {
	Category    string                             `json:"category"`
	LabelKey    string                             `json:"label_key"`
	Confidence  int                                `json:"confidence"`
	Evidence    []ClassificationSignal             `json:"evidence"`
	Providers   []ProviderClassificationContribution `json:"providers"`
	ProviderCount int                              `json:"provider_count"`
}
