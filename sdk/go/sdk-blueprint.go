// v1
package actra

import "time"

// Types
type Action map[string]interface{}
type Actor map[string]interface{}
type Snapshot map[string]interface{}
type Decision map[string]interface{}
type Context interface{}
type EvaluationContext map[string]interface{}
type ActionInput struct {
	Action   Action
	Actor    Actor
	Snapshot Snapshot
}

// Resolver Types
type ActionBuilder func(actionType string, args []interface{}, kwargs map[string]interface{}, ctx Context) Action
type ActorResolver func(ctx Context) Actor
type SnapshotResolver func(ctx Context) Snapshot
type ActionResolver func(actionType string, args []interface{}, kwargs map[string]interface{}, ctx Context) Action
type ContextResolver func(args []interface{}, kwargs map[string]interface{}) Context
type ActionTypeResolver func(fn interface{}, args []interface{}, kwargs map[string]interface{}) string

// Errors
type ActraError struct{ Msg string }
type ActraPolicyError struct {
	ActraError
	Decision    Decision
	Context     EvaluationContext
	MatchedRule string
}
type ActraSchemaError struct{ ActraError }

// Decision Event
type DecisionEvent struct {
	Action     Action
	Decision   Decision
	Context    EvaluationContext
	Timestamp  time.Time
	DurationMs float64
}

func (e *DecisionEvent) Effect() string      { return e.Decision["effect"].(string) }
func (e *DecisionEvent) MatchedRule() string { return e.Decision["matched_rule"].(string) }
func (e *DecisionEvent) IsBlocked() bool     { return e.Effect() == "block" }
func (e *DecisionEvent) ActionType() string  { return e.Action["type"].(string) }

// Policy
type Policy struct{}

func (p *Policy) Evaluate(ctx ActionInput) Decision { return Decision{} }
func (p *Policy) EvaluateAction(action Action, actor Actor, snapshot Snapshot) Decision {
	return Decision{}
}
func (p *Policy) Explain(ctx ActionInput) Decision                       { return Decision{} }
func (p *Policy) PolicyHash() string                                     { return "" }
func (p *Policy) AssertEffect(ctx ActionInput, expected string) Decision { return Decision{} }

// Actra Loader
type Actra struct{}

func (a *Actra) FromStrings(schemaYaml, policyYaml string, governanceYaml ...string) *Policy {
	return &Policy{}
}
func (a *Actra) FromFiles(schemaPath, policyPath string, governancePath ...string) *Policy {
	return &Policy{}
}
func (a *Actra) FromDirectory(directory string) *Policy { return &Policy{} }
func (a *Actra) CompilerVersion() string                { return "0.0.0" }

// Runtime
type ActraRuntime struct {
	Policy             *Policy
	ActorResolver      ActorResolver
	SnapshotResolver   SnapshotResolver
	ActionResolver     ActionResolver
	ContextResolver    ContextResolver
	ActionTypeResolver ActionTypeResolver
}

func (r *ActraRuntime) SetActorResolver(fn ActorResolver)           {}
func (r *ActraRuntime) SetSnapshotResolver(fn SnapshotResolver)     {}
func (r *ActraRuntime) SetActionResolver(fn ActionResolver)         {}
func (r *ActraRuntime) SetContextResolver(fn ContextResolver)       {}
func (r *ActraRuntime) SetActionTypeResolver(fn ActionTypeResolver) {}
func (r *ActraRuntime) Allow(actionType string, ctx Context, fields map[string]interface{}) bool {
	return true
}
func (r *ActraRuntime) Block(actionType string, ctx Context, fields map[string]interface{}) bool {
	return false
}
func (r *ActraRuntime) Action(actionType string, fields map[string]interface{}) Action {
	return Action{"type": actionType}
}
func (r *ActraRuntime) BuildAction(actionType string, args []interface{}, kwargs map[string]interface{}, ctx Context) Action {
	return Action{"type": actionType}
}
func (r *ActraRuntime) BuildContext(action Action, ctx Context) EvaluationContext {
	return EvaluationContext{}
}
func (r *ActraRuntime) Evaluate(action Action, ctx Context) Decision { return Decision{} }
func (r *ActraRuntime) Explain(action Action, ctx Context) Decision  { return Decision{} }
func (r *ActraRuntime) Admit(actionType string, fields []string, builder ActionBuilder, fn func()) {
	fn()
}
func (r *ActraRuntime) Audit(actionType string, fields []string, builder ActionBuilder, fn func()) {
	fn()
}

// Aliases
var LoadPolicyFromFile = Actra{}.FromFiles
var LoadPolicyFromString = Actra{}.FromStrings
var CompilerVersion = Actra{}.CompilerVersion
var Version = "0.0.0"
