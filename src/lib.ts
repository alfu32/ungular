
export const id = {
    prefixes: {'' : 0},
    getId( pref = '' ) {
        if(typeof((id.prefixes as {[pref: string]: number})[pref]) === 'undefined' ) {
            (id.prefixes as {[pref: string]: number})[pref] = 0;
        }
        return ++(id.prefixes as {[pref: string]: number})[pref];
    },
    uuid() {
        const isString = `${S4()}${S4()}-${S4()}-${S4()}-${S4()}-${S4()}${S4()}${S4()}`;
        return isString;
        function S4(): string {
            // tslint:disable-next-line: no-bitwise
            return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
        }
    }
}

export const schema: {[table: string]: any} = {
    components: [],
    nodes: [],
    compiledNodes: new Array<CompiledComponent>(),
    compiledComponents: [],
    rels: [],
}
export const index: {[table: string]: any} = {
    components: {},
    nodes: {},
    compiledNodes: {},
    compiledComponents: {},
    rels: {},
}
export const db: {[key: string]: any} = {
    index,
    schema,
};

export class CompiledComponent{
    path: Array<string> = [];
    name: StringTransform;
    node: XmlElement;
    package: string = '';
    import: string = '';
    definition: string = '';
    invocation: string = '';
    instantiation: string = '';
    constructor(name: StringTransform){
        this.name = name;
    }
}
export type NodeCollection = {[index: number]: XmlElement; length: number};
export class XmlElement{
    _nsMap: {[key:string]: any} = {};
    attributes: NodeCollection = {length: 0};
    childNodes: NodeCollection = {length: 0};
    ownerDocument: XmlElement = null;
    nodeName: string = '#document';
    tagName: string = null;
    namespaceURI: string = null;
    localName: string = null;
    previousSibling: XmlElement = null;
    nextSibling: XmlElement = null;
    parentNode: XmlElement = null;
    lineNumber: number;
    columnNumber: number;
    firstChild: XmlElement = null;
    lastChild: XmlElement = null;
    id: string | number = null;
    dbRef: string = null;
    scopeId: string = null;
    outerXml: string = null;
    innerXml: string = null;
    wrapperXml: string = null;
    startTag: string = null;
    endTag: string = null;
}

export function padText(txt: string, depth: number) {
    const padding = new Array(depth).fill(' ').join('');
    return txt.split('\n')
    .map( (l: any) => padding + l )
    .join('\n');
}
export function unpadText(txt: string, depth: number) {
    return txt.split('\n')
    .map( (l: any) => l.substr(depth) )
    .join('\n');
}

export class StringTransform {
    str: string[] = [];
    constructor(str: string[]) {
        this.str = str;
    }
    static fromCamelCase(s: string) {
        return StringTransform.fromKebapCase(s.replace(/[A-Z]/g,function(match, position){return '-'+match.toLowerCase()}));
    }
    static fromKebapCase(s: string) {
        return new StringTransform(s.split('-'));
    }
    static fromSnakeCase(s: string) {
        return new StringTransform(s.split('_'));
    }
    toCamelCase(){
        const r: string = this.toPascalCase()
        return r[0].toLowerCase() + r.substr(1);
    }
    toSnakeCase() {
        return this.str.map( s => s.toLowerCase() ).join('_');
    }
    toSnakeUpperCase() {
        return this.str.map( s => s.toUpperCase() ).join('_');
    }
    toKebapCase(){
        return this.str.map( s => s.toLowerCase() ).join('-');
    }
    toPascalCase(){
        return this.str.map( s => s[0].toUpperCase() + s.substr(1) ).join('');
    }
}
export function stringify(obj: any, padstr = '' , depth = 5, padding = '') {
    switch(typeof(obj)){
        case 'string': return JSON.stringify(obj);break;
        case 'number': return JSON.stringify(obj);break;
        case 'undefined': return JSON.stringify(obj);break;
        case 'symbol': return JSON.stringify(obj);break;
        case 'function': return '[Function]';break;
        case 'object':
            if(obj === null){
                return null;
            }
            if( depth > 0 ){
                if( obj instanceof Array) {
                    return '[\n'
                        + obj.reduce( (a, item: any)=>{
                            const strItem = JSON.stringify(item);
                            if( strItem && strItem.length < 240 ) {
                                a.push(padstr + padding + strItem);
                            } else {
                                a.push(stringify(item, padstr, depth - 1, padstr + padding ));
                            }
                            return a;
                        },[])
                        .join(",\n")
                        +'\n' + padding + ']';
                } else {
                    const ob = Object.keys(obj).reduce( (a: any, k: string)=>{
                        const strItem = JSON.stringify(obj[k]);
                        if( strItem && strItem.length < 240 ) {
                            a.push(`${padstr}${padding}${k}: ${strItem}`);
                        } else {
                            a.push(`${padstr}${padding}${k}: ${stringify(obj[k], padstr, depth - 1, padstr + padding )}`);
                        }
                        return a;
                    },[]);
                    // const str = JSON.stringify(o);
                    // if( str.length < 240) {
                    //     o.toJSON = () => o;
                    // }
                    return '{\n'
                    + ob.join(",\n")
                    +`\n${padding}}`;
                }
            } else {
                return obj.toString();
            }
            break;
    }
}
export function jsonDepth(obj: any, depth=5) {
    switch(typeof(obj)){
        case 'string': return obj;break;
        case 'number': return obj;break;
        case 'undefined': return obj;break;
        case 'symbol': return obj;break;
        case 'function': return obj.toString();break;
        case 'object':
            if(obj === null){
                return null;
            }
            if( depth > 0 ){
                if( obj instanceof Array) {
                    return obj.reduce( (a, item: any)=>{
                        a.push(jsonDepth(item, depth - 1));
                        return a;
                    },[])
                } else {
                    const o = Object.keys(obj).reduce( (o: any, k: string)=>{
                        o[k] = jsonDepth(obj[k], depth - 1);
                        return o;
                    },{});
                    // const str = JSON.stringify(o);
                    // if( str.length < 240) {
                    //     o.toJSON = () => o;
                    // }
                    return o;
                }
            } else {
                return obj.toString();
            }
            break;
    }
}
export function jsonReplacerOneline(k: string | Symbol, obj: any) {
    switch(typeof(obj)){
        case 'string': return obj;break;
        case 'number': return obj;break;
        case 'undefined': return 'undefined';break;
        case 'symbol': return 'symbol';break;
        case 'function': return obj.toString();break;
        case 'object':
            if(obj === null){
                return null;
            }
            const result = JSON.stringify(obj);
            if(result.length < 240){
                return obj;
            } else {
                return obj;
                if( obj instanceof Array) {
                    return obj.reduce( (a: any[], item: any)=>{
                        a.push(JSON.stringify(item, jsonReplacerOneline, '  '));
                        return a;
                    },[])
                } else {
                    return Object.keys(obj).reduce( (o: any, k: string)=>{
                        o.push(`${o[k]} = ${JSON.stringify(obj[k], jsonReplacerOneline, '  ')}`);
                        return o;
                    },[])
                }
            }
            break;
    }
  }