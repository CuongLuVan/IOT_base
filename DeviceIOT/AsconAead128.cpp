#include "AsconAead128.h"

struct AsconState { uint64_t x[5]; };
static uint64_t ror64(uint64_t x, int n) { return (x >> n) | (x << ((64 - n) & 63)); }
static uint64_t load(const uint8_t *p, size_t n) { uint64_t x = 0; for (size_t i=0;i<n;i++) x |= (uint64_t)p[i] << (8*i); return x; }
static void store(uint8_t *p, uint64_t x, size_t n) { for (size_t i=0;i<n;i++) p[i]=(uint8_t)(x>>(8*i)); }
static uint64_t clear(uint64_t x, size_t n) { for (size_t i=0;i<n;i++) x &= ~((uint64_t)0xff << (8*i)); return x; }
static void round(AsconState &s, uint8_t c) {
  s.x[2]^=c; s.x[0]^=s.x[4]; s.x[4]^=s.x[3]; s.x[2]^=s.x[1]; AsconState t;
  t.x[0]=s.x[0]^(~s.x[1]&s.x[2]); t.x[1]=s.x[1]^(~s.x[2]&s.x[3]); t.x[2]=s.x[2]^(~s.x[3]&s.x[4]); t.x[3]=s.x[3]^(~s.x[4]&s.x[0]); t.x[4]=s.x[4]^(~s.x[0]&s.x[1]);
  t.x[1]^=t.x[0]; t.x[0]^=t.x[4]; t.x[3]^=t.x[2]; t.x[2]=~t.x[2];
  s.x[0]=t.x[0]^ror64(t.x[0],19)^ror64(t.x[0],28); s.x[1]=t.x[1]^ror64(t.x[1],61)^ror64(t.x[1],39); s.x[2]=t.x[2]^ror64(t.x[2],1)^ror64(t.x[2],6); s.x[3]=t.x[3]^ror64(t.x[3],10)^ror64(t.x[3],17); s.x[4]=t.x[4]^ror64(t.x[4],7)^ror64(t.x[4],41);
}
static void permute(AsconState &s, int rounds) { static const uint8_t rc[12]={0xf0,0xe1,0xd2,0xc3,0xb4,0xa5,0x96,0x87,0x78,0x69,0x5a,0x4b}; for(int i=12-rounds;i<12;i++) round(s,rc[i]); }
static void init(AsconState &s,const uint8_t k[16],const uint8_t n[16]) { uint64_t k0=load(k,8),k1=load(k+8,8); s.x[0]=0x00001000808c0001ULL;s.x[1]=k0;s.x[2]=k1;s.x[3]=load(n,8);s.x[4]=load(n+8,8);permute(s,12);s.x[3]^=k0;s.x[4]^=k1; }
static void absorbAd(AsconState &s,const uint8_t *ad,size_t len) { if(len) { while(len>=16){s.x[0]^=load(ad,8);s.x[1]^=load(ad+8,8);permute(s,8);ad+=16;len-=16;} if(len>=8){s.x[0]^=load(ad,8);s.x[1]^=load(ad+8,len-8);s.x[1]^=(uint64_t)1<<(8*(len-8));}else{s.x[0]^=load(ad,len);s.x[0]^=(uint64_t)1<<(8*len);}permute(s,8);} s.x[4]^=0x8000000000000000ULL; }
static void finish(AsconState &s,const uint8_t k[16],uint8_t tag[16]) { uint64_t k0=load(k,8),k1=load(k+8,8);s.x[2]^=k0;s.x[3]^=k1;permute(s,12);s.x[3]^=k0;s.x[4]^=k1;store(tag,s.x[3],8);store(tag+8,s.x[4],8); }
bool asconAead128Encrypt(const uint8_t k[16],const uint8_t n[16],const uint8_t *ad,size_t al,const uint8_t *m,size_t ml,uint8_t *c,uint8_t tag[16]) { AsconState s;init(s,k,n);absorbAd(s,ad,al);while(ml>=16){s.x[0]^=load(m,8);s.x[1]^=load(m+8,8);store(c,s.x[0],8);store(c+8,s.x[1],8);permute(s,8);m+=16;c+=16;ml-=16;}if(ml>=8){s.x[0]^=load(m,8);s.x[1]^=load(m+8,ml-8);store(c,s.x[0],8);store(c+8,s.x[1],ml-8);s.x[1]^=(uint64_t)1<<(8*(ml-8));}else{s.x[0]^=load(m,ml);store(c,s.x[0],ml);s.x[0]^=(uint64_t)1<<(8*ml);}finish(s,k,tag);return true; }
bool asconAead128Decrypt(const uint8_t k[16],const uint8_t n[16],const uint8_t *ad,size_t al,const uint8_t *c,size_t cl,const uint8_t tag[16],uint8_t *m) { AsconState s;init(s,k,n);absorbAd(s,ad,al);while(cl>=16){uint64_t a=load(c,8),b=load(c+8,8);store(m,s.x[0]^a,8);store(m+8,s.x[1]^b,8);s.x[0]=a;s.x[1]=b;permute(s,8);c+=16;m+=16;cl-=16;}if(cl>=8){uint64_t a=load(c,8),b=load(c+8,cl-8);store(m,s.x[0]^a,8);store(m+8,s.x[1]^b,cl-8);s.x[0]=a;s.x[1]=clear(s.x[1],cl-8)|b;s.x[1]^=(uint64_t)1<<(8*(cl-8));}else{uint64_t a=load(c,cl);store(m,s.x[0]^a,cl);s.x[0]=clear(s.x[0],cl)|a;s.x[0]^=(uint64_t)1<<(8*cl);}uint8_t expected[16];finish(s,k,expected);uint8_t d=0;for(int i=0;i<16;i++)d|=expected[i]^tag[i];return d==0; }
