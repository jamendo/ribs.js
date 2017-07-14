// Type definitions for Ribs
// Project: https://github.com/chrisweb/ribs.js
// Definitions by: Norbert TRAN PHAT <https://github.com/MasGaNo>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

// Library documentation : https://github.com/chrisweb/ribs.js/blob/master/README.md

/// <reference path="../backbone/backbone.d.ts" />

declare module Ribs {

    interface ViewOptions extends Backbone.ViewOptions<Backbone.Model> {
        /** 
         * If true, remove model from its collection on view close
         **/
        removeModelOnClose?: boolean;
        reRenderOnChange?: boolean;
        listSelector?: string;
        templateVariables?: Object;
        ModelView?: typeof View;
        ModelViewOptions?: ViewOptions;
        collection?: Ribs.Collection;
        subviewAsyncRender?: boolean;
        closeModelOnClose?: boolean;
        closeCollectionOnClose?: boolean;
        [extra: string]: any;
    }

    interface ViewReference {
        $html: JQuery;
        container: Backbone.View<Backbone.Model>;
    }

    interface CollectionOptions extends Backbone.CollectionFetchOptions {
        adapter?: Ribs.Adapter.Adapter;
        comparator?: string | Function;
        reset?: boolean;
    }

    interface ModelOptions extends Backbone.ModelFetchOptions {
        adapter?: Ribs.Adapter.Adapter;
        closeModelOnDestroy?: boolean;
    }

    interface ContainerOptions {
        insertMode?: string
    }

    class View extends Backbone.View<Backbone.Model> {

        public constructor(options?: ViewOptions);
        protected onInitializeStart(): void;
        protected onInitialize(): void;
        public create(): JQuery|PromiseLike<JQuery>;
        public render(): any;
        protected onRenderStart(): void;
        protected onRender(): void;
        protected onRenderAll(): void;
        protected reRenderModelView(): void;
        public htmlize(): JQuery|PromiseLike<JQuery>;
        protected getModelAsJson(): JSON;
        protected getCollectionAsJson(): JSON;
        public clear(): void;
        public empty(): void;
        protected reset(): void;
        public close(): void;
        protected onCloseStart(): void;
        protected onClose(): void;
        protected addModel(model: Backbone.Model): void;
        protected removeModel(model: Backbone.Model): void;
        protected onModelAdded(modelView: View): void;
        protected onModelRemoved(modelView: View): void;
        protected formatModelViewOptions(modelViewOptions: Ribs.ViewOptions): Ribs.ViewOptions;
        protected prepareAddedView(modelView: Ribs.View): Ribs.View;
        protected updatePromise: PromiseLike<any>;
        protected isClose: Boolean;


        public addView(viewList: { [selector: string]: Ribs.View }): { [selector: string]: JQuery|PromiseLike<JQuery> };
        public addView(viewList: { [selector: string]: Ribs.View[] }): { [selector: string]: (JQuery|PromiseLike<JQuery>)[]};
        public addView(selector: string, view: Ribs.View): JQuery|PromiseLike<JQuery>;
        public addView(selector: string, view: Ribs.View[]): (JQuery|PromiseLike<JQuery>)[];
        
        public isDispatch: boolean;
        //protected template: Function;
        protected referenceModelView: { [selector: string]: { [cid: string]: ViewReference } };

        public options: Ribs.ViewOptions;
        public pendingViewModelPromise: PromiseLike<JQuery>[];//readonly

    }

    class Model extends Backbone.Model {
        constructor(attributes, options?: ModelOptions);
        protected onInitializeStart(): void;
        protected onInitialize(): void;
        /**
            * Get a projection of the model. The model return will be sync with this current model.
            * @param modelClass Class of model projection.
            * @param keepAlive If true, when this model will be destroy, the projection will not be destroyed.
            * @param twoWay If true, this model will be sync with its own attribute. So if a projection change one of these attributes, this model will be affected.
            **/
        public getModelProjection(modelClass?: typeof Model, keepAlive?: boolean, twoWay?: boolean): Model;

        public close(): void;


        /**
         * Original Model source
         */
        public modelSource: Ribs.Model;

        public adapter: Ribs.Adapter.Adapter;

        public options: Ribs.ModelOptions;

        protected isClose: boolean;
    }

    class Collection extends Backbone.Collection<Ribs.Model> {
        constructor(models?, options?: CollectionOptions);
        onInitialize(options?: any): void;
        batchSave(): void;
        getFilteredCollection(onlyData?: any, notDatas?: any): Collection;
        getRange(start: number, length: number): Collection;
        rangeNextPage(): Collection;
        rangeNext(): Collection;
        rangeGoTo(index: number, newLength?: number): Collection;
        setRangeLength(length: number): Collection;

        _isRange: boolean;
        isCircularRange: boolean;
        _currentRange: number;
        _lengthRange: number;

        public adapter: Ribs.Adapter.Adapter;
        collectionSource: Ribs.Collection;

        protected options: Ribs.CollectionOptions;

        protected isClose: boolean;
        public close();
    }

    class Controller {
        public constructor(options: any, configuration: any, router: Ribs.Router);

        protected onInitialize(options: any, configuration: any, router: Ribs.Router);
        extend(): void;
        initialize(): void;
        create(skeleton: any): PromiseLike<any>;
        clear(): void;
        off;
        promise;
        protected options;
        protected router: Ribs.Router;
		protected configuration;
    }

    module Container {
        function dispatch(containerSelector?: string, options?: Ribs.ContainerOptions): PromiseLike<any>|void;
        function add(containerSelector: string, view: any): void;
        function remove(containerSelector: string, view: any): void;
        function clear(containerSelector: string): void;
    }

    class CEventsManager extends Backbone.Events {
        
        public constants: { [index: string]: string};

    }
    
    var EventsManager: CEventsManager;

    class Router extends Backbone.Router {
        constructor(options?: Backbone.RouterOptions);
        public execute(callback, routeArguments, routeName, internalCallback): void;
        public getCurrentRoute(): string;
    }

    function ViewsLoader(views: string, callback: Function);

    module ViewHelper {
        function add(helperName: string, helperCallback: Function): void;
        function remove(helperName: string): void;
        function get(): { [s: string]: Function };
    }
    
    module Adapter {

        interface RequestAdapterOptions {
            data: {};
            type: string;
            url: string;
            limit?: number;
            order?: string;
            offset?: number;
            success?: (response: string|{}) => any;
            error?: (xhr: Adapter.Request, textStatus: string|string[], errorThrown: string|Error|(string|Error)[]) => any;
        }

        /**
         * Class of Adapter to allow sync method to connect to different kind of connection.
         **/
        class Adapter {

            public options: {};

            public constructor(options?: {});
            /**
             * Format options and convert data
             * @param options List of options for the Adapter object.
             * @return Modified options.
             **/
            protected formatOptions(options: {}): {};
            /**
             * Apply the Adapter method. Call it before sync call.
             **/
            public load();
            /**
             * Return the instance of the request adapter
             * @param Options of the request adapter
             * @return The Request adapter instance
             **/
            protected getRequestInstance(options?: RequestAdapterOptions): Request;
        }

        /**
         * Class of Request Adapter. It will perform the connection.
         **/
        class Request {
            /**
             * Options of the request.
             **/
            public options: {};
            public constructor(options?: {});
            /**
             * Format options and convert data
             * @param options List of options for the Request object.
             * @return Modified options.
             **/
            protected formatOptions(options: Ribs.Adapter.RequestAdapterOptions): Ribs.Adapter.RequestAdapterOptions;
            /**
             * Format response and convert data
             * @param response Response for the Request object.
             * @return Modified response.
             **/
            protected formatResponse(response: any): any;
            /**
             * Add new header request.
             * @param headerName Name of the header.
             * @param headerValue Value of the header. Expect a string, so JSON/Object should be serialized
             * @return Current instance Request to allow chaining operation.
             **/
            public setRequestHeader(headerName: string, headerValue: string): Request;
        }

        /**
         * Default Adapter. Based on Backbone implementation.
         **/
        class DefaultAdapter extends Adapter {
            /**
             * Return the default Backbone implementation.
             * @param options Options for Backbone request.
             * @return Default Request Adapter: JQueryXHR.
             **/
            protected getRequestInstance(options?: RequestAdapterOptions): DefaultRequest;
        }
        /**
         * Default Request. Based on Backbone implementation.
         **/
        class DefaultRequest extends Request {
            public requestList: JQueryXHR[];
        }
    }
}

declare module 'ribsjs' {
    export = Ribs;
}
