import test from 'node:test';
import assert from 'node:assert/strict';
import { authContinuationUrl, beginPaymentSignUp, clearPaymentReturn, getPaymentReturnUrl, postAuthDestination, validatePaymentReturnUrl } from '../src/lib/coursePaymentReturn.ts';
const origin='https://dataplusacademy.com';
let stored;
function visit(url){globalThis.window={location:new URL(url,origin)};}
function reset(){stored=new Map();globalThis.localStorage={getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)};visit('/');}

test('course intent survives signup, verification in another browser, and onboarding',()=>{
 reset();const target='/course/course-123?cohort=cohort-456#pricing';
 const signup=beginPaymentSignUp(target);visit(signup);
 const callback=authContinuationUrl('/auth/callback?role=student');
 assert.equal(new URL(callback,origin).searchParams.get('role'),'student');
 // The email link contains intent independently of browser storage.
 reset();visit(callback);
 const onboarding=postAuthDestination({role:'student',onboarding_completed:false});
 assert.equal(new URL(onboarding,origin).pathname,'/onboarding');
 visit(onboarding);
 const checkout=postAuthDestination({role:'student',onboarding_completed:true});
 const result=new URL(checkout,origin);
 assert.equal(result.pathname,'/course/course-123');
 assert.equal(result.searchParams.get('cohort'),'cohort-456');
 assert.equal(result.searchParams.get('paymentStep'),'payment');
 assert.equal(result.hash,'#pricing');
 assert.ok(stored.has('coursePaymentReturnState'),'redirects must not clear intent early');
 visit(checkout);clearPaymentReturn();assert.equal(getPaymentReturnUrl(),null);
});

test('existing-account login and bundle checkout retain the selected item',()=>{
 reset();visit(beginPaymentSignUp('/bundles?bundle=bundle-9'));
 visit(authContinuationUrl('/auth'));
 const dest=new URL(postAuthDestination({role:'student',onboarding_completed:true}),origin);
 assert.equal(dest.pathname,'/bundles');assert.equal(dest.searchParams.get('bundle'),'bundle-9');
});

test('checkout works when browser storage is disabled',()=>{
 reset();globalThis.localStorage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');},removeItem(){throw Error('disabled');}};
 visit(beginPaymentSignUp('/course/course-4'));
 visit(authContinuationUrl('/auth/callback'));
 visit(postAuthDestination({role:'student',onboarding_completed:false}));
 assert.equal(postAuthDestination({role:'student',onboarding_completed:true}),'/course/course-4?paymentStep=payment');
 clearPaymentReturn();
});

test('untrusted redirects are rejected, including browser-normalized URLs',()=>{
 reset();for(const value of ['https://evil.example/course/a','//evil.example/course/a','/\\evil.example/course/a','javascript:alert(1)','/admin/dashboard','/course/a/../../admin','/bundles','/course/a%2Fb',null,42]){
 assert.equal(validatePaymentReturnUrl(value,origin),null,String(value));
 }
 beginPaymentSignUp('/course/previous');visit('/auth?returnTo=https%3A%2F%2Fevil.example');
 assert.equal(getPaymentReturnUrl(),null);assert.equal(stored.size,0);
});

test('legacy saved state resumes safely and malformed state is discarded',()=>{
 reset();stored.set('coursePaymentReturnState',JSON.stringify({returnUrl:'/course/legacy?cohort=old',paymentStep:'payment'}));
 assert.equal(getPaymentReturnUrl(),'/course/legacy?cohort=old&paymentStep=payment');
 stored.set('coursePaymentReturnState','invalid-json');assert.equal(getPaymentReturnUrl(),null);assert.equal(stored.size,0);
});

test('ordinary sign-in routes by role; an admin never passes through student onboarding',()=>{
 reset();assert.equal(postAuthDestination({role:'student',onboarding_completed:true}),'/student/dashboard');
 assert.equal(postAuthDestination({role:'teacher',onboarding_completed:true}),'/teacher/dashboard');
 assert.equal(postAuthDestination({role:'teacher',onboarding_completed:false}),'/teacher/onboarding');
 visit(beginPaymentSignUp('/course/a'));
 assert.equal(postAuthDestination({role:'admin',onboarding_completed:false}),'/admin/dashboard');
});
