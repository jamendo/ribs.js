/// <reference types="backbone" />
/// <reference types="jquery" />
import * as Backbone from 'backbone';
import * as Ribs from './ribs';
export interface IModelOptions extends Backbone.ModelFetchOptions {
    adapter?: Ribs.Adapter.Adapter;
    closeModelOnDestroy?: boolean;
}
export declare class Model<TAttr extends {} = { [attr: string]: any; }> extends Backbone.Model {
    adapter: Ribs.Adapter.Adapter;
    protected isClose: Boolean;
    constructor(attributes: TAttr, options?: Ribs.IModelOptions);
    initialize(attributes: TAttr, options: any): void;
    private onDestroy();
    close(): void;
    sync(...arg: any[]): JQueryXHR;
    get<K extends keyof TAttr>(attribute: K): TAttr[K];
    set(obj: Partial<TAttr>, options?: Backbone.ModelSetOptions): Backbone.Model;
    set<K extends keyof TAttr>(attribute: K, value: TAttr[K]): Backbone.Model;
    toJSON(): any;
    /**
     * Get a projection of the model. The model return will be sync with this current model.
     * @param modelClass Class of model projection.
     * @param keepAlive If true, when this model will be destroy, the projection will not be destroyed.
     * @param twoWay If true, this model will be sync with its own attribute. So if a projection change one of these attributes, this model will be affected.
     **/
    getModelProjection(modelClass?: typeof Model, keepAlive?: boolean, twoWay?: boolean): Model;
    modelSource: Model;
    lastModelTriggered: Model;
    options: any;
    onInitialize: any;
    onInitializeStart: any;
}
export default Model;
