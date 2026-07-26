package core

import (
	"encoding/json"
	"fmt"
	"strings"
)

//go:generate go tool golang.org/x/tools/cmd/stringer -type=StrictArity -trimprefix=StrictArityFlag -output=strictarity_stringer_generated.go

// StrictArity controls which AST kinds get strict parameter-count checking
// during signature comparison. It is a bitmap where each bit represents one
// kind of signature declaration. The zero value means no strict arity checking
// is applied (beyond existing internal subtype reduction).
type StrictArity uint16

// Individual AST kind flags for StrictArity.
const (
	StrictArityFlagCallSignature       StrictArity = 1 << 0 // interface/type call signature: (x: number): void
	StrictArityFlagConstructSignature  StrictArity = 1 << 1 // interface/type construct signature: new (): Foo
	StrictArityFlagMethodSignature     StrictArity = 1 << 2 // interface method signature: foo(): void
	StrictArityFlagMethodDeclaration   StrictArity = 1 << 3 // class method: foo() { }
	StrictArityFlagConstructor         StrictArity = 1 << 4 // class constructor: constructor() { }
	StrictArityFlagFunctionDeclaration StrictArity = 1 << 5 // function declaration: function foo() { }
	StrictArityFlagFunctionExpression  StrictArity = 1 << 6 // function expression: const x = function() { }
	StrictArityFlagArrowFunction       StrictArity = 1 << 7 // arrow function: () => { }
	StrictArityFlagFunctionType        StrictArity = 1 << 8 // function type annotation: (x: number) => void
	StrictArityFlagConstructorType     StrictArity = 1 << 9 // constructor type annotation: new (x: number) => Foo
)

// Preset values for StrictArity.
const (
	StrictArityNone StrictArity = 0
	StrictArityAll  StrictArity = StrictArityFlagCallSignature |
		StrictArityFlagConstructSignature |
		StrictArityFlagMethodSignature |
		StrictArityFlagMethodDeclaration |
		StrictArityFlagConstructor |
		StrictArityFlagFunctionDeclaration |
		StrictArityFlagFunctionExpression |
		StrictArityFlagArrowFunction |
		StrictArityFlagFunctionType |
		StrictArityFlagConstructorType
)

// HasKind returns true if strict arity checking should apply to the given AST kind.
// The kind parameter comes from a signature's target.declaration.Kind (cast to uint16).
func (s StrictArity) HasKind(kind uint16) bool {
	return s&kindToStrictArityFlag(kind) != 0
}

// kindToStrictArityFlag maps an AST kind (as raw uint16) to its corresponding StrictArity bit.
//
// NOTE: The ast.Kind constants are hardcoded as raw numbers rather than imported from
// the ast package to avoid a circular import (core cannot depend on ast). These values
// must be kept in sync with the ast.Kind* constants:
//
//	ast.KindCallSignature       = 180
//	ast.KindConstructSignature  = 181
//	ast.KindMethodSignature     = 174
//	ast.KindMethodDeclaration   = 175
//	ast.KindConstructor         = 177
//	ast.KindFunctionDeclaration = 263
//	ast.KindFunctionExpression  = 219
//	ast.KindArrowFunction       = 220
//	ast.KindFunctionType        = 185
//	ast.KindConstructorType     = 186
func kindToStrictArityFlag(kind uint16) StrictArity {
	switch kind {
	case 180: // ast.KindCallSignature
		return StrictArityFlagCallSignature
	case 181: // ast.KindConstructSignature
		return StrictArityFlagConstructSignature
	case 174: // ast.KindMethodSignature
		return StrictArityFlagMethodSignature
	case 175: // ast.KindMethodDeclaration
		return StrictArityFlagMethodDeclaration
	case 177: // ast.KindConstructor
		return StrictArityFlagConstructor
	case 263: // ast.KindFunctionDeclaration
		return StrictArityFlagFunctionDeclaration
	case 219: // ast.KindFunctionExpression
		return StrictArityFlagFunctionExpression
	case 220: // ast.KindArrowFunction
		return StrictArityFlagArrowFunction
	case 185: // ast.KindFunctionType
		return StrictArityFlagFunctionType
	case 186: // ast.KindConstructorType
		return StrictArityFlagConstructorType
	default:
		return 0
	}
}

// flagNameToStrictArity maps string names to their StrictArity flag values.
var flagNameToStrictArity = map[string]StrictArity{
	"callsignature":       StrictArityFlagCallSignature,
	"constructsignature":  StrictArityFlagConstructSignature,
	"methodsignature":     StrictArityFlagMethodSignature,
	"methoddeclaration":   StrictArityFlagMethodDeclaration,
	"constructor":         StrictArityFlagConstructor,
	"functiondeclaration": StrictArityFlagFunctionDeclaration,
	"functionexpression":  StrictArityFlagFunctionExpression,
	"arrowfunction":       StrictArityFlagArrowFunction,
	"functiontype":        StrictArityFlagFunctionType,
	"constructortype":     StrictArityFlagConstructorType,
	"all":                 StrictArityAll,
	"none":                StrictArityNone,
}

// UnmarshalJSON implements json.Unmarshaler.
// It accepts:
//   - "all" → StrictArityAll
//   - "none" → StrictArityNone (also the zero value)
//   - a number → interpreted as the raw bitmap value
//   - an array of strings → each string is a kind name, OR'd together
//   - boolean true → StrictArityAll
//   - boolean false → StrictArityNone
func (s *StrictArity) UnmarshalJSON(data []byte) error {
	// Try boolean first
	if string(data) == "true" {
		*s = StrictArityAll
		return nil
	}
	if string(data) == "false" {
		*s = StrictArityNone
		return nil
	}

	// Try string
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		flag, ok := flagNameToStrictArity[str]
		if !ok {
			return fmt.Errorf("unknown strictArity value: %q", str)
		}
		*s = flag
		return nil
	}

	// Try number
	var num uint16
	if err := json.Unmarshal(data, &num); err == nil {
		*s = StrictArity(num)
		return nil
	}

	// Try array of strings
	var arr []string
	if err := json.Unmarshal(data, &arr); err == nil {
		var result StrictArity
		for _, name := range arr {
			flag, ok := flagNameToStrictArity[name]
			if !ok {
				return fmt.Errorf("unknown strictArity value: %q", name)
			}
			result |= flag
		}
		*s = result
		return nil
	}

	return fmt.Errorf("invalid strictArity value: %s", string(data))
}

// MarshalJSON implements json.Marshaler.
func (s StrictArity) MarshalJSON() ([]byte, error) {
	return json.Marshal(uint16(s))
}

// ParseStrictArity parses a string value into a StrictArity bitmap.
// It accepts comma-separated kind names (case-insensitive), "all", "none", "true", or "false".
func ParseStrictArity(value string) StrictArity {
	value = strings.TrimSpace(value)
	if value == "" {
		return StrictArityNone
	}
	// Handle boolean-like strings
	if value == "true" {
		return StrictArityAll
	}
	if value == "false" {
		return StrictArityNone
	}
	// Try single value lookup first
	if flag, ok := flagNameToStrictArity[strings.ToLower(value)]; ok {
		return flag
	}
	// Try comma-separated
	var result StrictArity
	for _, part := range strings.Split(value, ",") {
		part = strings.TrimSpace(part)
		if flag, ok := flagNameToStrictArity[strings.ToLower(part)]; ok {
			result |= flag
		}
	}
	return result
}
