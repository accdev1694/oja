const fs=require('fs');
function r(p){return fs.readFileSync(p,'utf8')}
function w(p,c){fs.writeFileSync(p,c)}
const B='convex/';let c;
c=r(B+'admin/content.ts');c=c.replace('updates: any','updates: Record<string, unknown>');w(B+'admin/content.ts',c);console.log('admin/content.ts');
c=r(B+'admin/helpers.ts');c=c.replace('data: any;','data: unknown;');w(B+'admin/helpers.ts',c);console.log('admin/helpers.ts');
