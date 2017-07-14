'use strict';

import ViewHelper = require('./viewHelper');
import Container = require('./container');
import Backbone = require('backbone');
import $ = require('jquery');
import _ = require('underscore');
import FSPromise = require('FSPromise');
import Promise = FSPromise.FSPromise;

class View extends Backbone.View<Backbone.Model> {

    static defaultOptions: Ribs.ViewOptions = {
        removeModelOnClose: true, // Boolean: If true, remove model from its collection on view close
        reRenderOnChange: false,
        listSelector: '.list',
        templateVariables: {},
        ModelView: null,
        ModelViewOptions: {},
        closeModelOnClose: true,
        closeCollectionOnClose: true,
        subviewAsyncRender: false
    };
    options: Ribs.ViewOptions;

    referenceModelView: { [selector: string]: { [cid: string]: Ribs.View } };
    isDispatch: boolean = false;
    template;

    private pendingViewModel: JQuery[];
    public pendingViewModelPromise: PromiseLike<JQuery>[];//readonly
    private waitingForSort: boolean;
    private waitingForUpdateCollection: boolean;
    protected updatePromise: PromiseLike<any>;
    private isCollectionRendered: boolean;
    private isSubviewRendered: boolean;
    private $previousEl: JQuery;
    private lastRenderPromise: FSPromise<JQuery>;
    private isCreating: boolean;
    private createPromise: PromiseLike<JQuery>;

    protected isClose: Boolean;

    private removeModelCallback: (model: Ribs.Model) => any;
    private destroyViewCallback: (model: Ribs.Model) => any;

    constructor(options?) {
        super(options);
    }

    initialize(options) {

        this.pendingViewModel = [];
        this.waitingForSort = false;
        this.waitingForUpdateCollection = false;
        this.isCollectionRendered = false;
        this.isSubviewRendered = false;
        this.isCreating = false;
        this.createPromise = null;
        this.isClose = false;

        this.pendingViewModelPromise = [];

        this.options = $.extend({}, View.defaultOptions, options || {});

        this.onInitializeStart();
            
        // collection children views, usefull when collection view gets
        // destroyed and we want to take some action on sub views
        this.referenceModelView = {};
        this.referenceModelView[this.options.listSelector] = {};

        if (this.collection) {

            this.listenTo(this.collection, 'add', this.addModel);
            this.listenTo(this.collection, 'remove', this.removeModel);
            this.listenTo(this.collection, 'reset', this.reset);
            this.listenTo(this.collection, 'sort', this.sortModel);
            this.listenTo(this.collection, 'update', this.updateCollection);

        }

        if (this.model) {

            this.listenTo(this.model, 'destroy', this.close);

        }

        this.removeModelCallback = this.removeModel.bind(this);

        this.destroyViewCallback = this.onDestroySubView.bind(this);

        this.onInitialize();
        
    }

    render() {

        this.onRenderStart();

        this.isCollectionRendered = false;
        this.isSubviewRendered = false;

        let htmlizeObject = this.htmlize();

        let doRender = ($renderedTemplate: JQuery): View|PromiseLike<View> => {

            if (this.isClose) {
                return this;
            }

            this.setElement($renderedTemplate);

            if (this.model && this.options.reRenderOnChange) {

                this.listenTo(this.model, 'change', this.reRenderModelView);

            }

            this.onRender();

            this.isDispatch = true;
            this.lastRenderPromise = null;

            if (this.pendingViewModelPromise.length) {
                return Promise.all(this.pendingViewModelPromise).then(() => {

                    this.onRenderAll();
                    return this;
                });
            }

            if (this.waitingForUpdateCollection) {
                this._updateCollection();
                this.waitingForUpdateCollection = false;
            }
            this.onRenderAll();
            return this;
        }

        if (htmlizeObject instanceof Promise) {

            if (!!this.lastRenderPromise) {
                this.lastRenderPromise.abort();
            }

            this.lastRenderPromise = htmlizeObject;

            return (htmlizeObject as Promise).then(doRender);

        }

        return doRender(<JQuery>htmlizeObject);

    }

    reRenderModelView() {

        this.onRenderStart();

        this.$previousEl = this.$el;
        let htmlizeObject = this.htmlize();

        let doRerender = ($renderedTemplate: JQuery): View|PromiseLike<View> => {

            if (this.isClose) {
                return this;
            }

            this.$previousEl.replaceWith($renderedTemplate);
            this.$previousEl = null;
            this.setElement($renderedTemplate);

            this.onRender();
            this.lastRenderPromise = null;
            this.onRenderAll();
            return this;
        }

        if (htmlizeObject instanceof Promise) {

            if (!!this.lastRenderPromise) {
                this.lastRenderPromise.abort();
            }
            this.lastRenderPromise = htmlizeObject;
            (htmlizeObject as Promise).then(doRerender);
        } else {
            doRerender(<JQuery>htmlizeObject);
        }

    }

    private htmlizeView(): JQuery|PromiseLike<JQuery> {

        let templateKeyValues;

        let templateData = {};
        let postTemplateData = { _view: this };

        if (this.model) {
            
            // model view
            // are there also templateVariables
            if (_.keys(this.options.templateVariables).length > 0) {

                templateKeyValues = $.extend(templateData, ViewHelper.get(), this.options.templateVariables, this.getModelAsJson(), postTemplateData);

            } else {

                templateKeyValues = $.extend(templateData, ViewHelper.get(), this.getModelAsJson(), postTemplateData);

            }


        } else if (_.keys(this.options.templateVariables).length > 0) {

            // templateVariables view
            templateKeyValues = $.extend(templateData, ViewHelper.get(), this.options.templateVariables, postTemplateData);

        } else {
                
            // basic view
            templateKeyValues = $.extend(templateData, ViewHelper.get(), postTemplateData);

        }

        let templateResult = this.template(templateKeyValues);

        if (templateResult instanceof Promise) {
            return templateResult;
        }

        return $(templateResult);

    }

    htmlize(): JQuery|PromiseLike<JQuery> {

        // is there a model or templateVariables or nothing?
        let viewHtml: JQuery|PromiseLike<JQuery> = this.htmlizeView();

        let doCollection = ($renderedTemplate: JQuery): JQuery|PromiseLike<JQuery> => {
            // and also a collection?
            this.isCollectionRendered = true;

            if (this.collection) {
            
                // for each model of the collection append a modelView to
                // collection dom

                if (this.collection.models.length > 0) {

                    if (this.pendingViewModelPromise) {
                        while (this.pendingViewModelPromise.length) {
                            let promise = this.pendingViewModelPromise.pop();
                            if (promise && 'abort' in promise) {
                                (<any>promise).abort();
                            }
                        }
                    }
                    if (this.updatePromise) {
                        (<any>this.updatePromise).abort();
                        this.updatePromise = null;
                    }

                    let promiseList: PromiseLike<JQuery>[] = [];

                    this.collection.models.forEach((model: Ribs.Model) => {

                        promiseList.push(this.addModel(model));

                    });

                    var $container = $renderedTemplate.find(this.options.listSelector);

                    if ($container.length === 0) {

                        if (($container = $renderedTemplate.filter(this.options.listSelector)).length === 0) {

                            $container = $();

                        }

                    }

                    this.isCollectionRendered = false;

                    return Promise.all(promiseList).then(() => {
                        this.isCollectionRendered = true;
                        this.updateCollection($container);
                        return $renderedTemplate;
                    });

                }

            }

            return $renderedTemplate;
        };

        let doSubView = ($renderedTemplate: JQuery): JQuery|PromiseLike<JQuery> => {

            this.isSubviewRendered = true;

            let promiseList = [];

            _.each(this.referenceModelView, (modelViewList, selector) => {
                if (selector === this.options.listSelector) {
                    return;
                }

                _.each(modelViewList, (modelView) => {

                    this.prepareAddedView(modelView);
                    promiseList.push(modelView.create());

                });

            });

            let allPromisesSubView = null;
            if (promiseList.length) {

                if (this.options.subviewAsyncRender) {
                    _.each(this.referenceModelView, (modelViewList, selector) => {
                        if (selector !== this.options.listSelector) {

                            this._addView(selector, Object.keys(modelViewList).map((cid) => { return modelViewList[cid] }), $renderedTemplate);

                        }
                    })
                } else {

                    allPromisesSubView = Promise.all(promiseList).then(() => {

                        let promiseAddView = [];

                        _.each(this.referenceModelView, (modelViewList, selector) => {
                            if (selector !== this.options.listSelector) {

                                promiseAddView.push(this._addView(selector, Object.keys(modelViewList).map((cid) => { return modelViewList[cid] }), $renderedTemplate));

                            }
                        })

                        if (promiseAddView.length) {
                            return Promise.all(promiseAddView).then(() => {
                                return $renderedTemplate;
                            });
                        }

                        return $renderedTemplate;
                    });
                }
            }

            if (allPromisesSubView !== null) {
                return allPromisesSubView;
            }

            return $renderedTemplate;

        };

        if (viewHtml instanceof Promise) {
            return (<PromiseLike<JQuery>>viewHtml).then(doCollection).then(doSubView);
        }

        let doCollectionView = doCollection(<JQuery>viewHtml);

        if (doCollectionView instanceof Promise) {
            return (doCollectionView as Promise).then(doSubView);
        }

        return doSubView(<JQuery>doCollectionView);

    }

    getModelAsJson() {

        var data;

        if (this.model) {

            data = this.model.toJSON();

        }

        return data;

    }

    getCollectionAsJson() {

        var data;

        if (this.collection) {

            data = this.collection.toJSON();

        }

        return data;

    }

    close() {

        this.isClose = true;

        this.onCloseStart();

        if (this.lastRenderPromise) {
            this.lastRenderPromise.abort();
            this.lastRenderPromise = null;
        }

        if (this.pendingViewModel.length) {
            this.pendingViewModel.splice(0, this.pendingViewModel.length);
            this.pendingViewModel = null;
        }
        if (this.pendingViewModelPromise.length) {
            while (this.pendingViewModelPromise.length) {
                let promise = this.pendingViewModelPromise.pop();
                if ('abort' in promise) {
                    (<any>promise).abort();
                }
            }
            this.pendingViewModelPromise = null;
        }


        if (this.updatePromise) {
            if ('abort' in this.updatePromise) {
                (<any>this.updatePromise).abort();
            }
            this.updatePromise = null;
        }

        this.$previousEl = null;
        if (this.createPromise) {
            if ('abort' in this.createPromise) {
                (<any>this.createPromise).abort();
            }
            this.createPromise = null;
        }


        this.trigger('close', this);

        // remove the view from dom and stop listening to events that were
        // added with listenTo or that were added to the events declaration
        this.remove();
        
        // unbind events triggered from within views using backbone events
        this.unbind();
        
        this.stopListening();

        if (!!this.collection) {
                
            // TODO: ...

            if ('close' in this.collection && (!this.options || this.options.closeCollectionOnClose !== false)) {
                (<Ribs.Collection>this.collection).close();
            }

            this.collection = null;

        }

        if (this.referenceModelView !== null) {

            _.each(this.referenceModelView, (modelViewCollection: { [cid: string]: Ribs.View }, selector) => {

                _.each(modelViewCollection, (modelView, cid) => {

                    delete this.referenceModelView[selector][cid];

                    this.onModelRemoved(modelView);

                    modelView.stopListening(modelView, 'close', this.destroyViewCallback);
                    
                    modelView.close();

                });

            });


            this.referenceModelView = null;

        }

        if (!!this.model) {

            if (this.options) {
                if (this.options.removeModelOnClose === true && !!this.collection === true) {//!!this.model.collection === true) {
				
                    this.collection.remove(this.model);
                    //this.model.collection.remove(this.model);
				
                }

                if (this.options.closeModelOnClose !== false && 'close' in this.model) {
                    (<Ribs.Model>this.model).close();
                }

            } else if ('close' in this.model) {

                (<Ribs.Model>this.model).close();

            }

            this.model = null;

        }

        this.onClose();

    }

    create(): JQuery|PromiseLike<JQuery> {

        if (this.isDispatch === true) {

            return this.$el;

        }

        if (this.isCreating === true) {

            return this.createPromise;

        }

        let renderObject = this.render();

        if (renderObject instanceof Promise) {

            this.isCreating = true;

            return this.createPromise = (<PromiseLike<View>>renderObject).then((view: View) => {
                this.isCreating = false;
                return this.$el;
            });

        }

        return this.$el;

    }

    clear() {

        Ribs.Container.clear(this.options.listSelector);

    }

    empty() {
            
        //Container.clear(this.options.listSelector);
            
        if (this.referenceModelView !== null) {

            _.each(this.referenceModelView, (modelViewList: { [cid: string]: Ribs.View }, selector) => {
                _.each(modelViewList, (modelView, cid) => {

                    delete this.referenceModelView[selector][cid];

                    this.onModelRemoved(modelView);

                    modelView.stopListening(modelView, 'close', this.destroyViewCallback);
                    
                    modelView.close();

                });
            });

            this.referenceModelView = {};
            if ('listSelector' in this.options) {
                this.referenceModelView[this.options.listSelector] = {};
            }

        }

    }

    reset(collection) {

        this.removeUnusedModelView(collection);

        _.each(collection.models, (function (newModel) {

            this.addModel(newModel);

        }).bind(this));

        this.updateCollection();

    }

    removeUnusedModelView(collection) {

        collection = collection || this.collection;

        let collectionModelView = this.referenceModelView[this.options.listSelector];

        if (!collectionModelView) {
            return;
        }

        _.each(collectionModelView, (viewModel, cid) => {

            if (!collection.get(cid)) {

                viewModel.close();

                delete collectionModelView[cid];

            }

        });

    }

    private addModel(model: Ribs.Model): PromiseLike<JQuery> {

        if (this.isCollectionRendered === false) {
            return;
        }

        if (!(this.options.listSelector in this.referenceModelView)) {
            this.referenceModelView[this.options.listSelector] = {};
        }


        if (model.cid in this.referenceModelView[this.options.listSelector]) {

            var $element = this.referenceModelView[this.options.listSelector][model.cid].$el;

            this.pendingViewModel.push($element);

            return;

        }

        if (this.options.ModelView === null) {

            throw new Error('a collection view needs a ModelView passed on instantiation through the options');

        }

        let ModelView = this.options.ModelView;

        var mergedModelViewOptions = this.formatModelViewOptions($.extend({}, this.options.ModelViewOptions, { model: model, parentView: this }));

        var modelView = new ModelView(mergedModelViewOptions);

        let viewCreate = modelView.create();

        let doAddModel = ($element: JQuery): JQuery | PromiseLike<JQuery> => {

            this.pendingViewModel.push($element);

            // TODO: use the container to manage subviews of a list
            //Container.add(this.options.listSelector, modelView);

            if (!(this.options.listSelector in this.referenceModelView)) {
                this.referenceModelView[this.options.listSelector] = {};
            }

            this.referenceModelView[this.options.listSelector][model.cid] = modelView;

            this.onModelAdded(modelView);

            model.listenToOnce(model, 'close:model', this.removeModelCallback);

            return $element;
        }

        if (viewCreate instanceof Promise) {
            this.pendingViewModelPromise.push(viewCreate as Promise);
            return (viewCreate as Promise).then(doAddModel);
        }

        return Promise.resolve(doAddModel(<JQuery>viewCreate));

    }

    protected formatModelViewOptions(modelViewOptions): Ribs.ViewOptions {
        return modelViewOptions;
    }

    private removeModel(model: Ribs.Model) {

        var view = this.referenceModelView[this.options.listSelector][model.cid];

        if (view === undefined) {
            return view;
        }

        model.stopListening(model, 'close:model', this.removeModelCallback);

        // TODO: use the container to manage subviews of a list
        //Container.remove(this.options.listSelector, view.container);
                
        delete this.referenceModelView[this.options.listSelector][model.cid];

        this.onModelRemoved(view);

        view.stopListening(view, 'close', this.destroyViewCallback);
        
        view.close();
        
        return view;

    }

    private sortModel($container: JQuery = null) {

        if (this.pendingViewModel.length || this.pendingViewModelPromise.length || this.isDispatch === false) {
            this.waitingForSort = true;
            return;
        }

        if (!($container instanceof $) || $container === null) {
            $container = this.$el.find(this.options.listSelector);

            if ($container.length === 0) {

                $container = this.$el.filter(this.options.listSelector);

                if ($container.length === 0) {

                    return;

                }

            }
        }

        // avoid lot of reflow and repaint.
        let displayCss = $container.css('display') || '';
        $container.css('display', 'none');

        _.each(this.collection.models, (model) => {

            var modelView = this.referenceModelView[this.options.listSelector][model.cid];

            $container.append(modelView.$el);


        });

        $container.css('display', displayCss);

    }

    private updateCollection($container: JQuery = null) {
        if (this.pendingViewModelPromise.length) {
            if (this.updatePromise) {
                (<any>this.updatePromise).abort();
                this.updatePromise = null;
            }
            this.updatePromise = Promise.all(this.pendingViewModelPromise).then(() => {
                this.updatePromise = null;
                this.pendingViewModelPromise = [];
                this._updateCollection($container)
            });
        } else {
            this._updateCollection($container);
        }
    }

    private _updateCollection($container: JQuery = null) {

        if (this.isDispatch === false) {
            this.waitingForUpdateCollection = true;
            return;
        }

        if ($container === null || !($container instanceof $)) {

            $container = this.$el.find(this.options.listSelector);

            if ($container.length === 0) {

                if (($container = this.$el.filter(this.options.listSelector)).length === 0) {

                    $container = $();

                }

            }

        }

        // avoid lot of reflow and repaint.
        let displayCss = $container.css('display') || '';
        $container.css('display', 'none');

        $container.append(this.pendingViewModel);

        this.pendingViewModel.splice(0, this.pendingViewModel.length);

        if (this.waitingForSort) {
            this.sortModel($container);

            this.waitingForSort = false;
        }

        $container.css('display', displayCss);
    }

    public addView(selector: string|{ [selector: string]: Ribs.View|Ribs.View[] }, view: Ribs.View|Ribs.View[]) {

        let displayMode = this.$el.css('display') || '';// Use css because some time show/hide use not expected display value
        this.$el.css('display', 'none');// Don't display to avoid reflow

        let returnView;

        if (typeof selector !== 'string') {
            returnView = {};
            _.each(selector, (viewList, selectorPath) => {
                returnView[selectorPath] = this._addView(selectorPath, viewList);
            });

        } else {

            returnView = this._addView(<string>selector, view);

        }

        this.$el.css('display', displayMode);

        return returnView;

    }

    private _addView(selector: string, view: Ribs.View|Ribs.View[], $el: JQuery = this.$el): JQuery|PromiseLike<JQuery>|(JQuery|PromiseLike<JQuery>)[] {

        if (!(selector in this.referenceModelView)) {
            this.referenceModelView[selector] = {};
        }

        let doAddView = (viewToAdd: Ribs.View): JQuery|PromiseLike<JQuery> => {

            this.referenceModelView[selector][viewToAdd.cid] = viewToAdd;

            if (this.isDispatch !== true && $el === this.$el) {
                return;
            }

            let $container = $el.find(selector);

            if ($container.length === 0) {

                if (($container = $el.filter(selector)).length === 0) {

                    $container = $();

                }

            }

            $container.append(viewToAdd.$el);

            viewToAdd.stopListening(viewToAdd, 'close', this.destroyViewCallback)
            viewToAdd.listenToOnce(viewToAdd, 'close', this.destroyViewCallback);

            if (viewToAdd.isDispatch === false) {
                let $oldEl = viewToAdd.$el;

                let newCreateView = viewToAdd.create();

                if (newCreateView instanceof Promise) {
                    return (newCreateView as Promise).then(($renderNewCreate) => {

                        // Replace node only if previous element has parent
                        // Avoid some conflict with render override in class which extend Ribs.View
                        if ($oldEl.parent().length > 0) {
                            $oldEl.replaceWith($renderNewCreate);
                        }

                        return $renderNewCreate;
                    });
                } else {

                    $oldEl.replaceWith(<JQuery>newCreateView);

                    return <JQuery>newCreateView;
                }

            }

            return viewToAdd.$el;

        };

        if (view instanceof Array) {
            return view.map(doAddView);
        }

        return doAddView(<Ribs.View>view);
    }

    private onDestroySubView(view: Ribs.View) {
        _.each(this.referenceModelView, (modelViewCollection: { [cid: string]: Ribs.View }, selector) => {

            _.each(modelViewCollection, (modelView, cid) => {

                if (modelView === view) {
                    delete this.referenceModelView[selector][cid];
                    this.onModelRemoved(modelView);
                }

            });

        });
    }

    protected prepareAddedView(modelView: Ribs.View): Ribs.View {
        return modelView;
    }

    protected onInitialize() { }
    protected onInitializeStart() { }
    protected onRender() { }
    protected onRenderStart() { }
    protected onRenderAll() { }
    protected onModelAdded(modelViewAdded: Ribs.View) { }
    protected onModelRemoved(modelViewRemoved: Ribs.View) { }
    protected onClose() { }
    protected onCloseStart() { }

}

export = View;
