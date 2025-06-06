//// [tests/cases/compiler/deeplyNestedConstraints.ts] ////

//// [deeplyNestedConstraints.ts]
// Repro from #41931

type Enum = Record<string, string | number>;

type TypeMap<E extends Enum> = { [key in E[keyof E]]: number | boolean | string | number[] };

class BufferPool<E extends Enum, M extends TypeMap<E>> {
    setArray2<K extends E[keyof E]>(_: K, array: Extract<M[K], ArrayLike<any>>) {
        array.length; // Requires exploration of >5 levels of constraints
    }
}


//// [deeplyNestedConstraints.js]
class BufferPool {
    setArray2(_, array) {
        array.length; // Requires exploration of >5 levels of constraints
    }
}


//// [deeplyNestedConstraints.d.ts]
// Repro from #41931
type Enum = Record<string, string | number>;
type TypeMap<E extends Enum> = {
    [key in E[keyof E]]: number | boolean | string | number[];
};
declare class BufferPool<E extends Enum, M extends TypeMap<E>> {
    setArray2<K extends E[keyof E]>(_: K, array: Extract<M[K], ArrayLike<any>>): void;
}
