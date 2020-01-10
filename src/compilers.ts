import { StringTransform, XmlElement, CompiledComponent } from "./lib";
import prettifyXml from 'prettify-xml';

const tsPrimitiveCompiler = {
    package(path: Array<string>) {
        return path.map( s => StringTransform.fromKebapCase(s).toCamelCase() ).join('.')
    },
    import(name: StringTransform){
        return `import { ${name.toPascalCase()}Component } from './${name.toKebapCase()}';`;
    },
    definition(name: StringTransform, node: XmlElement){
        return `
export class ${name.toPascalCase()}Component {
    compile(scope: any): string {
        return \`${node.outerXml}\`;
    }
}`.replace(/(\$\{scope\.|\$\{)/gi,'${scope.');
    },
    invocation(name: StringTransform){
        return `${name.toCamelCase()}.compile(scope)`;
    },
    instantiation(name: StringTransform){
        return `const ${name.toCamelCase()}: ${name.toPascalCase()}Component = new ${name.toPascalCase()}Component();`;
    },
}
const tsCompositeCompiler = {
    package(path: Array<string>) { return tsPrimitiveCompiler.package(path); },
    import(name: StringTransform){ return tsPrimitiveCompiler.import(name); },
    definition(name: StringTransform, precompiledComponent: CompiledComponent, children: {
        import: Array<string>;
        definition: Array<string>;
        invocation: Array<string>;
        instantiation: Array<string>;
    }){
        return `
${children.import.join('\n')}

export class ${name.toPascalCase()}Component {
    compile(scope: any): string {
        ${children.instantiation.join('\n        ')}
        return \`
            ${precompiledComponent.node.startTag.replace(/(\$\{scope\.|\$\{)/gi,'${scope.')}
            ${children.invocation.map(inv => `\$\{${inv}\}`).join('\n            ')}
            ${precompiledComponent.node.innerXml.replace(/(\$\{scope\.|\$\{)/gi,'${scope.')}
            ${precompiledComponent.node.endTag}
        \`;
    }
}
`;
    },
    invocation(name: StringTransform){ return tsPrimitiveCompiler.invocation(name); },
    instantiation(name: StringTransform){ return  tsPrimitiveCompiler.instantiation(name); },
}

const es5PrimitiveCompiler = {
    package(path: Array<string>) {
        return path.map( s => StringTransform.fromKebapCase(s).toCamelCase() ).join('.')
    },
    import(name: StringTransform){
        return `import ${name.toPascalCase()}Component from './${name.toKebapCase()}';`;
    },
    definition(name: StringTransform, node: XmlElement){
        return `
export class ${name.toPascalCase()}Component {
    compile(scope) {
        return \`${node.outerXml}\`;
    }
}`.replace(/(\$\{scope\.|\$\{)/gi,'${scope.');
    },
    invocation(name: StringTransform){
        return `${name.toCamelCase()}.compile(scope)`;
    },
    instantiation(name: StringTransform){
        return `const ${name.toCamelCase()} = new ${name.toPascalCase()}Component();`;
    },
}
const es5CompositeCompiler = {
    package(path: Array<string>) { return tsPrimitiveCompiler.package(path); },
    import(name: StringTransform){ return tsPrimitiveCompiler.import(name); },
    definition(name: StringTransform, precompiledComponent: CompiledComponent, children: {
        import: Array<string>;
        definition: Array<string>;
        invocation: Array<string>;
        instantiation: Array<string>;
    }){
        return `
${children.import.join('\n')}

export class ${name.toPascalCase()}Component {
    compile(scope) {
        ${children.instantiation.join('\n        ')}
        return \`
            ${precompiledComponent.node.startTag.replace(/(\$\{scope\.|\$\{)/gi,'${scope.')}
            ${children.invocation.map(inv => `\$\{${inv}\}`).join('\n            ')}
            ${precompiledComponent.node.innerXml.replace(/(\$\{scope\.|\$\{)/gi,'${scope.')}
            ${precompiledComponent.node.endTag}
        \`;
    }
}
`;
    },
    invocation(name: StringTransform){ return tsPrimitiveCompiler.invocation(name); },
    instantiation(name: StringTransform){ return  tsPrimitiveCompiler.instantiation(name); },
}

const javaPrimitiveCompiler = {
    package(path: Array<string>) {
        return path.map( s => StringTransform.fromKebapCase(s).toCamelCase() ).join('.')
    },
    import(name: StringTransform){
        return `import ${name.toPascalCase()}Component;`;
    },
    definition(name: StringTransform, node: XmlElement){
        return `
public class ${name.toPascalCase()}Component {
    String compile(Object scope) {
        return "${node.outerXml.replace(/"/gi,'\\"')}";
    }
}`.replace(/(\$\{scope\.|\$\{)/gi,'${scope.');
    },
    invocation(name: StringTransform){
        return `${name.toCamelCase()}.compile(scope)`;
    },
    instantiation(name: StringTransform){
        return `${name.toPascalCase()}Component ${name.toCamelCase()} = new ${name.toPascalCase()}Component();`;
    },
}
const javaCompositeCompiler = {
    package(path: Array<string>) { return tsPrimitiveCompiler.package(path); },
    import(name: StringTransform){ return tsPrimitiveCompiler.import(name); },
    definition(name: StringTransform, precompiledComponent: CompiledComponent, children: {
        import: Array<string>;
        definition: Array<string>;
        invocation: Array<string>;
        instantiation: Array<string>;
    }){
        return `
package ${precompiledComponent.package};

${children.import.join('\n')}

public class ${name.toPascalCase()}Component {
    String compile(Object scope) {
        ${children.instantiation.join('\n        ')}
        return "${
                precompiledComponent.node.startTag
                    .replace(/\n/gi, '')
                    .replace(/"/gi,'\\"')
                    .replace(/\${[a-zA-Z0-9.]+\}/gi,(a,b) =>`" + scope.${a.replace(/\$\{|\}/gi, '')} + "`)
                }"
            + ${children.invocation.map(inv => `${inv.replace(/"/gi,'\\"')}`).join('\n            + ')}
            + "${
                prettifyXml(precompiledComponent.node.innerXml)
                    .replace(/"/gi,'\\"')
                    .replace(/(\r\n){1,}/gi, '"\n            + "')
                    .replace(/\${[a-zA-Z0-9.]+\}/gi,(a: any,b: any) =>`"\n            + scope.${a.replace(/\$\{|\}/gi, '')}\n            + "`)
            }"
            + "${precompiledComponent.node.endTag}";
    }
}
`;
    },
    invocation(name: StringTransform){ return tsPrimitiveCompiler.invocation(name); },
    instantiation(name: StringTransform){ return  tsPrimitiveCompiler.instantiation(name); },
}

const cppPrimitiveCompiler = {
    package(path: Array<string>) {
        return path.map( s => StringTransform.fromKebapCase(s).toCamelCase() ).join('.')
    },
    import(name: StringTransform){
        return `#include "${name.toKebapCase()}.cpp";`;
    },
    definition(name: StringTransform, node: XmlElement){
        return `
class ${name.toPascalCase()}Component {
    public:
    String compile(Object scope) {
        return "${node.outerXml.replace(/"/gi,'\\"')}";
    }
}`.replace(/(\$\{scope\.|\$\{)/gi,'${scope.');
    },
    invocation(name: StringTransform){
        return `${name.toCamelCase()}->compile(scope)`;
    },
    instantiation(name: StringTransform){
        return `${name.toPascalCase()}Component ${name.toCamelCase()} = new ${name.toPascalCase()}Component();`;
    },
}
const cppCompositeCompiler = {
    package(path: Array<string>) { return tsPrimitiveCompiler.package(path); },
    import(name: StringTransform){ return tsPrimitiveCompiler.import(name); },
    definition(name: StringTransform, precompiledComponent: CompiledComponent, children: {
        import: Array<string>;
        definition: Array<string>;
        invocation: Array<string>;
        instantiation: Array<string>;
    }){
        return `
${children.import.join('\n')}

class ${name.toPascalCase()}Component {
    public:
    String compile(Object scope) {
        ${children.instantiation.join('\n        ')}
        return "${
                precompiledComponent.node.startTag
                    .replace(/\n/gi, '')
                    .replace(/"/gi,'\\"')
                    .replace(/\${[a-zA-Z0-9.]+\}/gi,(a,b) =>`" + scope->${a.replace(/\$\{|\}/gi, '')} >> "`)
                }"
            >> ${children.invocation.map(inv => `${inv.replace(/"/gi,'\\"')}`).join('\n            >> ')}
            >> "${
                prettifyXml(precompiledComponent.node.innerXml)
                    .replace(/"/gi,'\\"')
                    .replace(/(\r\n){1,}/gi, '"\n            >> "')
                    .replace(/\${[a-zA-Z0-9.]+\}/gi,(a: any,b: any) =>`"\n            + scope->${a.replace(/\$\{|\}/gi, '')}\n            >> "`)
            }"
            >> "${precompiledComponent.node.endTag}";
    }
}
`;
    },
    invocation(name: StringTransform){ return tsPrimitiveCompiler.invocation(name); },
    instantiation(name: StringTransform){ return  tsPrimitiveCompiler.instantiation(name); },
}


const phpPrimitiveCompiler = {
    package(path: Array<string>) {
        return path.map( s => StringTransform.fromKebapCase(s).toCamelCase() ).join('\'');
    },
    import(name: StringTransform){
        return `require_once("${name.toKebapCase()}");`;
    },
    definition(name: StringTransform, node: XmlElement){
        return `<?php
class ${name.toPascalCase()}Component {
    public function compile($scope) {
        return "${node.outerXml.replace(/"/gi,'\\"')}";
    }
}`.replace(/(\$\{scope\.|\$\{)/gi,'${$scope->');
    },
    invocation(name: StringTransform){
        return `${name.toCamelCase()}->compile($scope)`;
    },
    instantiation(name: StringTransform){
        return `$${name.toCamelCase()} = new ${name.toPascalCase()}Component();`;
    },
}
const phpCompositeCompiler = {
    package(path: Array<string>) { return tsPrimitiveCompiler.package(path); },
    import(name: StringTransform){ return tsPrimitiveCompiler.import(name); },
    definition(name: StringTransform, precompiledComponent: CompiledComponent, children: {
        import: Array<string>;
        definition: Array<string>;
        invocation: Array<string>;
        instantiation: Array<string>;
    }){
        return `<?php
${children.import.join('\n')}

class ${name.toPascalCase()}Component {
    public function compile($scope) {
        ${children.instantiation.join('\n        ')}
        return "
            ${precompiledComponent.node.startTag.replace(/"/gi,'\\"').replace(/(\$\{scope\.|\$\{)/gi,'{$scope->')}
            ${children.invocation.map(inv => `\$\{${inv}\}`).join('\n            ')}
            ${precompiledComponent.node.innerXml.replace(/"/gi,'\\"').replace(/(\$\{scope\.|\$\{)/gi,'{$scope->')}
            ${precompiledComponent.node.endTag}
        ";
    }
}
`;
    },
    invocation(name: StringTransform){ return tsPrimitiveCompiler.invocation(name); },
    instantiation(name: StringTransform){ return  tsPrimitiveCompiler.instantiation(name); },
}

export const compilers = {
    typescript: {
        extension: 'ts',
        primitive: tsPrimitiveCompiler,
        composite: tsCompositeCompiler
    },
    es5: {
        extension: 'js',
        primitive: es5PrimitiveCompiler,
        composite: es5CompositeCompiler
    },
    java: {
        extension: 'java',
        primitive: javaPrimitiveCompiler,
        composite: javaCompositeCompiler
    },
    cpp: {
        extension: 'cpp',
        primitive: cppPrimitiveCompiler,
        composite: cppCompositeCompiler
    },
    php: {
        extension: 'php',
        primitive: phpPrimitiveCompiler,
        composite: phpCompositeCompiler
    }
}