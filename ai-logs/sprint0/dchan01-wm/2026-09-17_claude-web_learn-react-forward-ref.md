# React ref forwarding breaking tooltip with link button

**Created:** 9/17/2026 3:16:23  
**Updated:** 9/17/2026 3:29:55  
**Exported:** 9/17/2026 13:04:49  
**Link:** [https://claude.ai/chat/a03d1290-301e-49ee-a082-c5d3e8bee08d](https://claude.ai/chat/a03d1290-301e-49ee-a082-c5d3e8bee08d)  

## User:

> 9/17/2026 3:16:24

Hey Claude, I know nothing about React, but I do have some experience with HTML / the DOM. Can you explain what this summary means? For context, I am trying to fix a bug involving a tooltip wrapper not actually working to display a tooltip. The wrapper goes around a button with a link.

SUMMARY:

Why the preview button's tooltip doesn't actually appear (this is a real bug, not just a positioning issue)

This traces directly to that comment. Look at how Button decides what to render, in packages/ui/components/button/Button.tsx:

const isLink = typeof props.href !== "undefined";

...

if (isLink) {

  return (

    <Link {...passThroughProps} className={buttonClassName} onClick={handleClick}>

      {buttonContent}

    </Link>

  );  // <-- no ref passed here

}

return (

  <Wrapper tooltip={props.tooltip} ...>

    <button ref={forwardedRef} ...>{buttonContent}</button>  // <-- ref IS passed here

  </Wrapper>

);

Button is created with forwardRef, meaning it receives a ref from whoever renders it, as a second function argument (forwardedRef). In the plain-button branch, that ref gets attached to the real <button> DOM element. In the <Link> branch — the one taken whenever href is set — forwardedRef is simply never used. It's dropped on the floor.

Now here's why that breaks the tooltip. Tooltip (in packages/ui/components/tooltip/Tooltip.tsx) is built on Radix UI:

<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

asChild is a Radix pattern: instead of rendering its own wrapper element, Trigger clones whatever single child you give it (here, your <Button href=... />) and injects extra props onto that clone — including a ref, plus hover/focus event handlers. Radix needs that ref to point at a real DOM node so it can measure its position on screen (to know where to draw the tooltip bubble) and track pointer enter/leave against it.

Since Button's <Link> branch never forwards that injected ref anywhere, the ref stays null — it never resolves to an actual <a> element in the DOM. Radix's positioning logic (built on Popper/floating-ui) has no anchor element to measure, so the tooltip content has nothing to position itself against and effectively never renders. That matches exactly what you're seeing: no visual difference at all, not even a misplaced tooltip.

This is a pre-existing bug that affects every <Tooltip><Button href=... /></Tooltip> in the codebase, not something specific to this file. Importantly, it also means my plan's proposed fix for the preview button (just adding side="bottom"/sideOffset={4} to the existing wrapper) wouldn't have actually fixed anything — those are just positioning knobs on a tooltip that isn't rendering in the first place. I've noted this in the plan file as a blocker to resolve/discuss before touching that button.

The "type conflict" comment

export type ButtonProps = ButtonBaseProps &

  (

    | (Omit<JSX.IntrinsicElements["a"], "href" | "onClick" | "ref"> & LinkProps)

    | (Omit<JSX.IntrinsicElements["button"], "onClick" | "ref"> & { href?: never })

  );

Some vocabulary first:

- Anchor element = the actual HTML <a href="..."> tag — the real DOM element browsers use for hyperlinks. It's a different HTML element from <button>, with different valid attributes (e.g. href, target, rel make sense on <a>, not on <button>).

- ref = React's escape hatch for getting a direct handle to the real underlying DOM node (or class component instance) instead of only interacting through props/state. You use it when you need to do something imperative — call .focus(), measure .getBoundingClientRect(), or, as here, let a library like Radix attach listeners directly to the actual element.

ButtonProps is a TypeScript union: either "anchor-shaped props" (must include href, from LinkProps) or "button-shaped props" (href explicitly disallowed via href?: never). Two consequences:

1. The two branches expect different, incompatible prop sets. <button> doesn't accept href at all in its type; Link requires it. If the code tried to pick the tag dynamically (const Tag = isLink ? Link : "button") and spread one shared passThroughProps object onto it, TypeScript can't prove which half of the union passThroughProps actually is at that point (the isLink boolean is a runtime check, not something TS automatically uses to narrow the type of props/passThroughProps for you), so it would flag a mismatch. Writing two fully separate if (isLink) return <Link/>; return <button/>; branches sidesteps that — each branch only ever has to satisfy one half of the union.

2. The ref types genuinely differ. A <button> ref is React.Ref<HTMLButtonElement>; an anchor/Link ref is React.Ref<HTMLAnchorElement>. Button's forwardedRef is typed as React.Ref<HTMLAnchorElement | HTMLButtonElement> to cover both cases — but you can't just hand that combined-type ref to a single call site that only accepts one specific element type without TypeScript complaining (or without an unsafe cast, which the project's rules explicitly forbid — no as any).

So the comment is explaining why the code is split into two returns (a real TypeScript constraint), but the accompanying assumption — "Link manages its own anchor element, so we don't need to pass ref to it" — turns out to be wrong in practice for this use case. Next's Link does support forwarding a ref down to its underlying <a>; the Button component just never wires it up in that branch. That gap is what's silently breaking your tooltip.

## Assistant:

> 9/17/2026 3:16:43

This is a well-written bug report. Let me break it down in terms you'll recognize from plain HTML/DOM work.

## The core problem, in HTML terms

Imagine you have this HTML:

```html
<a href="/preview">Preview</a>
```

A tooltip library needs to know *where that `<a>` element lives on the screen* so it can draw a little bubble near it. To do that, it needs a direct reference to the actual DOM node — the real `<a>` element in memory.

In React, that kind of direct DOM reference is called a **ref**. It's basically the React equivalent of `document.querySelector('a')` — a handle to the real element, not just the JSX description of it.

---

## What `forwardRef` is (the React-specific part)

Normally in React, a parent component can't reach *inside* a child component to grab its DOM node. `forwardRef` is the opt-in mechanism that lets a component say: "if someone passes me a ref, I'll attach it to my real DOM node so the caller can use it."

Think of it like a component promising: *"whoever wraps me can get a handle to my underlying `<a>` or `<button>`."*

---

## The two code paths, and where it breaks

The `Button` component has two branches depending on whether `href` is set:

- **No `href`** → renders a `<button>`, and correctly attaches the ref to it ✅
- **Has `href`** → renders a `<Link>` (which ultimately becomes an `<a>`), but **never attaches the ref** ❌

So when you wrap a `<Button href="...">` in a tooltip, the tooltip library hands the Button a ref and says "attach this to your DOM node." The Button receives it, then silently does nothing with it. The ref stays `null`.

---

## Why that breaks the tooltip specifically

The tooltip library being used (Radix UI) uses a pattern called `asChild`. Instead of wrapping your button in its own element, it clones your button and injects extra props onto it — including that ref, plus mouse event listeners.

Radix *needs* that ref to resolve to a real DOM element because:
1. It measures the element's position (`getBoundingClientRect()`) to know where to draw the bubble
2. It tracks when the pointer enters/leaves that element

Since the ref is `null`, Radix has no anchor. It can't position anything. The tooltip simply never appears — not even in the wrong place, just *nowhere*.

---

## The actual fix (conceptually)

The `<Link>` component *does* support having a ref forwarded through it to its underlying `<a>` tag — the `Button` component just never does it. The fix is to pass `forwardedRef` into the `<Link>` branch, the same way it's already passed into the `<button>` branch.

The TypeScript complexity mentioned in the summary is about *type-safety bookkeeping* — making sure the ref is declared as the right type (`HTMLAnchorElement` vs `HTMLButtonElement`) in each branch — but the underlying DOM fix is straightforward.

---

## Why the proposed positioning fix would have done nothing

The summary notes that someone was about to add `side="bottom"` and `sideOffset={4}` to the tooltip. Those are just *where* to draw the bubble relative to the anchor. But if there's no anchor (null ref), there's nothing to position relative to. It's like trying to set the `top` and `left` of an element that `display: none` — the positioning props are meaningless until the underlying problem is fixed.

## User:

> 9/17/2026 3:21:52

Does the parent component (the wrapper in this situation) have its own HTML element? How does it know that it is wrapping something? If a component is wrapping another, does the wrapper have its own HTML element? I assume that the React components are not actual HTML elements, thus you can't just directly query the children (element.children).

## Assistant:

> 9/17/2026 3:22:09

Great questions. Let me work through each one.

## React components vs. DOM elements

You're right that React components are not HTML elements. A React component is just a JavaScript function that *describes* what HTML to eventually produce. When React runs your app, it walks that description and builds the real DOM from it. So there are two separate trees:

- The **React tree** — components wrapping components, all JavaScript
- The **DOM tree** — the actual HTML elements the browser sees

A component can render zero, one, or many real DOM elements, or it might render only other components that eventually produce DOM elements. There's no guaranteed 1-to-1 mapping.

---

## Does a wrapper component have its own HTML element?

**Not automatically, no.** It depends entirely on what the component's function returns.

A wrapper like this *does* create a real DOM element:

```jsx
function Wrapper({ children }) {
  return <div className="tooltip-wrapper">{children}</div>;
}
```

That produces an actual `<div>` in the DOM that you could find with `querySelector`.

But a wrapper like this creates *no* DOM element of its own:

```jsx
function Wrapper({ children }) {
  return children; // just passes straight through
}
```

Radix's `asChild` pattern is specifically designed to avoid adding a wrapper element. Instead of rendering its own `<span>` or `<div>` around your button, it clones your button and injects the extra props (ref, event listeners) directly onto it. The DOM ends up with one `<a>` or `<button>` — not a wrapper around it.

---

## How does a wrapper know it's wrapping something?

Through a special prop called `children`. In JSX, anything you put between a component's opening and closing tags is automatically passed to that component as `props.children`. So:

```jsx
<Tooltip>
  <Button>Click me</Button>
</Tooltip>
```

is exactly equivalent to:

```jsx
<Tooltip children={<Button>Click me</Button>} />
```

`Tooltip` receives that `<Button>` description as a value it can do things with — render it as-is, clone it with extra props (what `asChild` does), wrap it in something, inspect it, etc.

---

## Can you query children like `element.children`?

Not really, and your instinct is correct about why. `props.children` is a React description (a JavaScript object), not a live DOM node. You can't call `.getBoundingClientRect()` on it or attach event listeners to it directly.

What you *can* do is use React's `cloneElement` to take that description and produce a modified copy of it with extra props merged in — which is exactly the `asChild` trick. It's roughly:

```jsx
// Instead of rendering <div>{children}</div>,
// stamp extra props onto the child itself
const child = React.Children.only(children);
return React.cloneElement(child, { ref: injectedRef, onMouseEnter: show, ... });
```

The child component then receives that injected ref as a prop and is *responsible for attaching it* to whatever real DOM element it renders. That's the contract Radix is relying on — and the contract `Button`'s `<Link>` branch is silently breaking by never attaching `forwardedRef` to anything.

## User:

> 9/17/2026 3:25:00

If Radix UI clones the button, how is there only one <a> or <button>? Maybe I misunderstand what clone means in this context. 

Also, with forwardedRef, is the idea that it is a pointer to the actual HTML element? However, it must propagate *upwards* from the child to the parent because the parent does not by itself know the HTML element of the child? The child sets the forwardedRef to point to the HTML element?

## Assistant:

> 9/17/2026 3:25:12

Both great clarifications to make.

## What "clone" means here

"Clone" here means copying the *description* (the JavaScript object), not duplicating a DOM element. React never actually renders `props.children` until a component explicitly returns it. So before `cloneElement` runs, there is no DOM element yet — just a plain JS object that says "I intend to be a Button with these props."

`cloneElement` takes that description object and produces a new description object with extra props merged in. Then *that* modified description gets returned and rendered — producing exactly one DOM element. Nothing was ever doubled.

A rough analogy: imagine `children` is a **blueprint** for a house. `cloneElement` lets you scribble some additions onto a copy of the blueprint before handing it to the construction crew. The crew still only builds one house.

---

## Yes, exactly — forwardedRef flows upward

You've got it right. The direction is counterintuitive at first:

1. The **parent** (Radix's Trigger) creates a ref — initially pointing at `null` — and injects it into the child via `cloneElement`
2. The **child** (Button) receives it as `forwardedRef`
3. The child attaches it to a real DOM element via `ref={forwardedRef}` on a tag like `<button>` or `<a>`
4. React, when building the DOM, sees that `ref=` and sets `forwardedRef.current` to point at the actual DOM node
5. Now the **parent** holds a ref whose `.current` is the child's real DOM element — even though the parent never touched the DOM itself

So yes — the parent hands down an *empty container* (the ref object), the child fills it in by attaching it to the DOM, and the parent reads it back. The child is the only one who knows which DOM element it actually renders, so it's the only one who can make that connection.

The bug is exactly this: in the `<Link>` branch, Button receives the ref from Radix, then never attaches it to anything. The container stays empty (`null`), and Radix is left waiting for a DOM node that never arrives.

## User:

> 9/17/2026 3:26:39

Can you explain the second part of the bug report? Why is typescript the reason that there are two different paths (the isLink path, and the other path)?

## Assistant:

> 9/17/2026 3:26:55

Sure. The TypeScript reason comes down to one core problem: **TypeScript has to verify prop types at compile time, but `isLink` is a runtime value.**

## The naive approach that doesn't work

You might expect the code to just do this:

```jsx
const Tag = isLink ? Link : "button";
return <Tag {...passThroughProps} />;
```

The problem is that `passThroughProps` is typed as the full union — either anchor-shaped props or button-shaped props. TypeScript looks at `<Tag {...passThroughProps} />` and has to verify that the props are valid *right there*, statically. It knows `Tag` could be either `Link` or `"button"`, and it knows `passThroughProps` could be either shape — but it cannot connect those two facts together. It can't reason "well, if Tag is Link then passThroughProps must be the anchor variant." That's a runtime relationship, not something TypeScript can see from the types alone.

So TypeScript throws up its hands and says: I can't prove this is safe.

## Why two separate returns fixes it

```jsx
if (isLink) {
  return <Link {...passThroughProps} />; // TS knows: in this branch, props must be anchor-shaped
}
return <button {...passThroughProps} />; // TS knows: in this branch, props must be button-shaped
```

The `if (isLink)` check, combined with how `ButtonProps` is defined as a union, gives TypeScript enough information to *narrow* the type in each branch. Inside the `if` block, it can prove props are the anchor variant. Below it, it can prove props are the button variant. Each call site only ever has to satisfy one half of the union, so TypeScript is happy.

## The ref type problem compounds this

Even if you somehow got around the props issue, the ref has the same problem. The `forwardedRef` is typed as `React.Ref<HTMLAnchorElement | HTMLButtonElement>` because it could be either. But `<button ref={...}>` only accepts `React.Ref<HTMLButtonElement>`, and `<Link ref={...}>` only accepts `React.Ref<HTMLAnchorElement>`. You can't pass the combined type to either without TypeScript complaining — it can't prove which specific type it is at that point.

Again, the two-branch approach solves this: in each branch, TypeScript has already narrowed the type enough to know which specific ref type applies.

## The actual bug this masks

The report notes that the assumption baked into the `isLink` branch — *"Link manages its own ref, so we don't need to forward it"* — is just wrong. Next's `Link` does support receiving a ref and passing it down to its underlying `<a>`. The Button component simply never wires it up. The TypeScript split is a legitimate code organization choice, but it accidentally made it easy to silently drop the ref in one branch without any compiler error catching it.

## User:

> 9/17/2026 3:29:48

Would the fix be as simple as adding ref={forwardedRef as React.Ref<HTMLAnchorElement>} to the isLink case?

## Assistant:

> 9/17/2026 3:29:55

Yes, almost certainly. Something like:

```jsx
if (isLink) {
  return (
    <Link
      {...passThroughProps}
      ref={forwardedRef as React.Ref<HTMLAnchorElement>}
      className={buttonClassName}
      onClick={handleClick}
    >
      {buttonContent}
    </Link>
  );
}
```

The cast (`as React.Ref<HTMLAnchorElement>`) is necessary purely to satisfy TypeScript — you're telling it "in this branch, I know this ref is meant for an anchor element." The runtime behavior is unaffected by the cast; it's just type bookkeeping.

The reason this is safe to assert is that the `isLink` branch is only reached when `href` is set, which means the component will always render an `<a>` in this branch. So the cast reflects reality — it's not a lie to the type system, just telling it something it couldn't figure out on its own.

One thing worth checking before shipping it: whether the project has a lint rule against `as` casts generally. The bug report mentioned the project forbids `as any` specifically — a cast to a concrete type like `React.Ref<HTMLAnchorElement>` is much less dangerous and is typically fine even in strict codebases, but worth a quick look at their eslint config to be sure.

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
