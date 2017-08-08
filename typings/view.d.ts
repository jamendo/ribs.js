/// <reference types="backbone" />
/// <reference types="jquery" />
import * as Backbone from 'backbone';
import * as FSPromise from 'FSPromise';
import Promise = FSPromise.FSPromise;
import * as Ribs from './ribs';
export interface IViewOptions extends Backbone.ViewOptions<Backbone.Model> {
    /**
     * If true, remove model from its collection on view close
     **/
    removeModelOnClose?: boolean;
    reRenderOnChange?: boolean;
    listSelector?: string;
    templateVariables?: Object;
    ModelView?: typeof View;
    ModelViewOptions?: IViewOptions;
    collection?: Ribs.Collection;
    subviewAsyncRender?: boolean;
    closeModelOnClose?: boolean;
    closeCollectionOnClose?: boolean;
    [extra: string]: any;
}
export interface IViewReference {
    $html: JQuery;
    container: Backbone.View<Backbone.Model>;
}
export declare class View extends Backbone.View<Backbone.Model> {
    static defaultOptions: Ribs.IViewOptions;
    options: Ribs.IViewOptions;
    referenceModelView: {
        [selector: string]: {
            [cid: string]: Ribs.View;
        };
    };
    isDispatch: boolean;
    template: any;
    private pendingViewModel;
    pendingViewModelPromise: Promise<JQuery>[];
    private waitingForSort;
    private waitingForUpdateCollection;
    protected updatePromise: Promise<any>;
    private isCollectionRendered;
    private isSubviewRendered;
    private $previousEl;
    private lastRenderPromise;
    private isCreating;
    private createPromise;
    protected isClose: Boolean;
    private removeModelCallback;
    private destroyViewCallback;
    constructor(options?: any);
    initialize(options: any): void;
    render(): View | Promise<View>;
    reRenderModelView(): void;
    private htmlizeView();
    htmlize(): JQuery | Promise<JQuery>;
    getModelAsJson(): any;
    getCollectionAsJson(): any;
    close(): void;
    create(): JQuery | Promise<JQuery>;
    clear(): void;
    empty(): void;
    reset(collection: any): void;
    removeUnusedModelView(collection: any): void;
    private addModel(model);
    protected formatModelViewOptions(modelViewOptions: any): Ribs.IViewOptions;
    private removeModel(model);
    private sortModel($container?);
    private updateCollection($container?);
    private _updateCollection($container?);
    addView(selector: string | {
        [selector: string]: Ribs.View | Ribs.View[];
    }, view: Ribs.View | Ribs.View[]): any;
    private _addView(selector, view, $el?);
    private onDestroySubView(view);
    protected prepareAddedView(modelView: Ribs.View): Ribs.View;
    protected onInitialize(): void;
    protected onInitializeStart(): void;
    protected onRender(): void;
    protected onRenderStart(): void;
    protected onRenderAll(): void;
    protected onModelAdded(modelViewAdded: Ribs.View): void;
    protected onModelRemoved(modelViewRemoved: Ribs.View): void;
    protected onClose(): void;
    protected onCloseStart(): void;
}
export default View;
