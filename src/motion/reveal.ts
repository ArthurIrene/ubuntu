/**
 * Scroll reveals — **the one locked motion Round 1 builds** *(motion.md §3)*.
 *
 * > *Each section rises once — about 15px plus fade, ~500ms — staggered within:
 * > heading, then body, then image. Section-level, never paragraph-level. Fires
 * > once; scrolling back up re-triggers nothing.*
 *
 * The animation itself is in `globals.css`. What lives here is the decision of
 * *when*, and the two guarantees around it:
 *
 * 1. **With no JavaScript the content is simply visible.** The CSS hides nothing
 *    on its own — every rule is gated behind `:root[data-reveal="armed"]`, and
 *    only `ARM` sets that attribute. A reader with no JS, a crawler, and a
 *    reader-mode parser all see a finished page.
 * 2. **Reduced motion gets the finished state, never a half-played one.** `ARM`
 *    returns before arming, and `globals.css` unarms in the media query as well,
 *    so the guarantee does not depend on the script having been reached.
 *
 * Any error at all unarms the page. The failure mode of this file is *no
 * animation*, never *invisible text* — which is why the whole of `SCAN` sits in
 * one `try`.
 *
 * **No library, no framework, no storage.** Two inline scripts and an
 * `IntersectionObserver`, because the thing being decided is genuinely "is this
 * on screen yet" and nothing smaller answers it.
 */

/**
 * Runs in `<head>`, before first paint.
 *
 * It has to be synchronous and it has to be early: arming after the first paint
 * would show the section and then hide it, which is worse than not animating.
 *
 * `matchMedia` and `IntersectionObserver` are both checked here rather than in
 * `SCAN`, so a browser that cannot do this never has its content hidden for even
 * one frame.
 */
export const ARM = `try{
if(!window.matchMedia||!('IntersectionObserver' in window))throw 0;
if(matchMedia('(prefers-reduced-motion: reduce)').matches)throw 0;
document.documentElement.dataset.reveal='armed'
}catch(e){}`;

/**
 * Runs at the end of `<body>`, with the whole document parsed.
 *
 * **Not `DOMContentLoaded`, and not a `useEffect`.** A parser-blocking script in
 * the last position runs after the content exists and before the browser has
 * painted it, which is the only place that reveals a section without ever having
 * flashed it. `useEffect` runs after paint, so hydration would show every armed
 * section as a blank gap first — the exact flash the arming is meant to prevent.
 *
 * A `MutationObserver` covers client-side navigation. `<Link>` swaps the page's
 * children without re-running this script, so without it the second page a
 * visitor opens would be armed, unobserved and therefore permanently invisible.
 * That is the failure this file most has to avoid, and React is not involved in
 * preventing it.
 *
 * **`innerHeight` is checked before anything is armed, and it is not paranoia.**
 * The rule is `top < innerHeight` — is this section on screen already. With a
 * viewport of zero height that is false for every section on the page, so every
 * one of them is handed to the observer, and an observer against a zero-height
 * viewport never reports an intersection. The result is a page that is armed,
 * pending, and permanently blank. Caught in headless Chrome, which renders
 * exactly that way; the honest reading is that any environment which cannot
 * measure a viewport should not be running an animation in it.
 */
export const SCAN = `(function(){
var root=document.documentElement;
if(root.dataset.reveal!=='armed')return;
if(!innerHeight){root.removeAttribute('data-reveal');return}
try{
var io=new IntersectionObserver(function(entries){
for(var i=0;i<entries.length;i++){
if(!entries[i].isIntersecting)continue;
io.unobserve(entries[i].target);
entries[i].target.dataset.shown=''
}
},{rootMargin:'0px 0px -8% 0px'});
var take=function(el){
if(el.dataset.shown!==undefined||el.dataset.pending!==undefined)return;
el.dataset.pending='';
if(el.getBoundingClientRect().top<innerHeight){el.dataset.immediate='';el.dataset.shown=''}
else io.observe(el)
};
var sweep=function(node){
if(node.nodeType!==1)return;
if(node.hasAttribute('data-section'))take(node);
var found=node.querySelectorAll('[data-section]');
for(var i=0;i<found.length;i++)take(found[i])
};
sweep(document.body);
new MutationObserver(function(records){
for(var i=0;i<records.length;i++)
for(var j=0;j<records[i].addedNodes.length;j++)sweep(records[i].addedNodes[j])
}).observe(document.body,{childList:true,subtree:true})
}catch(e){root.removeAttribute('data-reveal')}
})();`;
