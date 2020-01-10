import { fstat, readFileSync, readdirSync, writeFileSync, mkdirSync, rmdirSync, RmDirOptions, MakeDirectoryOptions } from "fs";
import { DOMParser, Element, XMLSerializer } from "xmldom";
import { release } from "os";
import { db, id, CompiledComponent, unpadText, padText, StringTransform, jsonDepth, jsonReplacerOneline, stringify, XmlElement } from "./lib";
import { compilers } from "./compilers";

const {primitive, composite, extension} = compilers.php;

console.log('Hello', process.cwd());
const domParser = new DOMParser();
let xmlSerializer = new XMLSerializer();
readdirSync('./assets')
.forEach( (f, i) => {
    console.log('asset', f);
    const [name,ext] = f.split('.');
    if (ext === 'xml') {
        const text = readFileSync(`./assets/${f}`).toString();
        const dom = domParser.parseFromString(text);
        dom.id = id.getId();
        dom.dbRef =  name;
        dom.scopeId = name;
        dom.outerXml = text;
        initSchemaFromDom(dom, [], name);
        db.schema.components.push(dom);
        db.index.components[name] = dom;
    }
});

Object.keys(db.index.compiledNodes)
.forEach( ref => {
    const compiledNode = db.index.compiledNodes[ref];
    compileNode(compiledNode, [], compiledNode.node.dbRef);
});
writeFileSync('db',stringify(jsonDepth(db.index.compiledNodes, 5), '  ', 5, ''));
try{
    rmdirSync(`../build/${extension}`, {recursive: true} as RmDirOptions);
}catch(err){
    console.log(err);
}
try{
    mkdirSync(`../build/${extension}`, {recursive:true});
}catch(err){
    console.log(err);
}
Object.keys(db.index.compiledNodes).forEach( k => {
    const node = db.index.compiledNodes[k];
    writeFileSync(`../build/${extension}/${node.name.toKebapCase()}.${extension}`, node.definition);
});
const validTag = /<.*?><\/.*?>|<.*?\/>/gi;
const validOpenClosedTag = /<.*?><\/.*?>|<.*?\/>/gi;
const validSelfClosingTag = /<.*?\/>/gi;
function initSchemaFromDom(node: XmlElement, _path = new Array<string>(), scope = '') {
    if(node){
        db.schema.nodes.push(node);
        db.index.nodes[node.id] = node;
        if( !node.dbRef ) {
            node.dbRef =  (node.tagName||'text-node') + '-' + (node.id);
        }
        let path = _path.concat(node.dbRef)
        node.scopeId = scope;
        node.outerXml = xmlSerializer.serializeToString(node);
        let innerXml: string[] = [];
        if(node.attributes && node.attributes.length) {
            Array.prototype.slice.call(node.attributes)
            .forEach( attr => {
                attr.id = id.getId();
                const rel = {parent: node.id, attr: attr.id, path: path.concat(attr.id), scope};
                db.index.rels[attr.id] = rel;
                db.schema.rels.push(rel);
                initSchemaFromDom(attr, path, scope);
                db.schema.nodes.push(attr);
                db.index.nodes[attr.id] = node;
            });
        }
        if(node.childNodes && node.childNodes.length) {
            Array.prototype.slice.call(node.childNodes)
            .forEach( n => {
                n.id = id.getId();
                const rel = {parent: node.id, child: n.id, path: path.concat(n.id), scope};
                db.schema.rels.push(rel);
                db.index.rels[n.id] = rel;
                initSchemaFromDom(n, path, scope);
                innerXml.push(n.outerXml);
            });
        }
        node.innerXml = innerXml.join('\n').replace(/(\n|\s{2,}|\r|\t)+/gi,'');
        node.wrapperXml = node.outerXml.replace(/(\n|\s{2,}|\r|\t)+/gi,'').replace(node.innerXml,'');
        if( node.wrapperXml.match(validTag) ) {
            const matchOpeningClosing = node.wrapperXml.match(validOpenClosedTag);
            if( matchOpeningClosing && matchOpeningClosing.length === 2 ) {
                [node.startTag, node.endTag] = matchOpeningClosing;
            } else {
                node.startTag = node.wrapperXml;
                node.endTag = '';
            }
        } else {
            node.startTag = '';
            node.endTag = '';
        }
        
        const name = StringTransform.fromKebapCase(node.dbRef);
        db.index.compiledNodes[node.dbRef] = {
            path: path,
            name: name,
            node: node,
            package: primitive.package(path),
            import: primitive.import(name),
            definition:primitive.definition(name, node),
            invocation: primitive.invocation(name),
            instantiation: primitive.instantiation(name),
        }
    }
}
function compileNode(compiledNode: CompiledComponent, path = new Array<string>(), scope = '') {
    const children = {
        import: new Array<string>(),
        definition: new Array<string>(),
        invocation: new Array<string>(),
        instantiation: new Array<string>(),
    }
    if(compiledNode.node && compiledNode.node.attributes) {
        Array.prototype.slice.call(compiledNode.node.attributes)
        .forEach( attr => {
            compileNode(attr, path.concat(attr.dbRef), scope);
            const cdata = db.index.compiledNodes[attr.dbRef];
            children.import.push(cdata.import);
            children.definition.push(cdata.definition);
            children.invocation.push(cdata.invocation);
            children.instantiation.push(cdata.instantiation);
        });
    }
    if(compiledNode.node && compiledNode.node.childNodes) {
        Array.prototype.slice.call(compiledNode.node.childNodes)
        .forEach( n => {
            compileNode(n, path.concat(n.dbRef), scope);
            const cdata = db.index.compiledNodes[n.dbRef];
            children.import.push(cdata.import);
            children.definition.push(cdata.definition);
            children.invocation.push(cdata.invocation);
            children.instantiation.push(cdata.instantiation);
        });
    }
    if(children.definition.length) {
        const name = StringTransform.fromKebapCase(compiledNode.node.dbRef);
        db.index.compiledNodes[compiledNode.node.dbRef].definition = composite.definition(name, compiledNode, children);
    }
}